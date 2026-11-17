// Enable the Advanced Drive service (v3). No secrets in source.
const ROOT = "1IS01GtI2kiI5LFOVb1IaO_pAkfZFx1iT";
const FIELDS = "id,name,mimeType,parents,trashed,appProperties";
function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function list(q) {
  let files = [],
    pageToken;
  do {
    const r = Drive.Files.list({
      q: q + " and trashed = false",
      fields: "nextPageToken,files(" + FIELDS + ")",
      pageSize: 100,
      pageToken: pageToken,
    });
    files = files.concat(r.files || []);
    pageToken = r.nextPageToken;
    if (files.length > 10000) throw Error("CAPACITY");
  } while (pageToken);
  return files;
}
function beneath(id) {
  if (id === ROOT) return true;
  const parents = Drive.Files.get(id, { fields: "parents" }).parents || [];
  return parents.some(beneath);
}
function indexFiles() {
  const props = PropertiesService.getScriptProperties();
  return ["INDEX_FILE_ID", "INDEX_BACKUP_ID"].map((key) => {
    const id = props.getProperty(key);
    if (!id) throw Error("SETUP_REQUIRED");
    return DriveApp.getFileById(id);
  });
}
function readIndex(files) {
  const candidates = files
    .map((file) => {
      try {
        const x = JSON.parse(file.getBlob().getDataAsString());
        if (
          !Number.isSafeInteger(x.revision) ||
          !x.tokens ||
          !x.codes ||
          !x.folders
        )
          return null;
        return x;
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
  if (!candidates.length) throw Error("INDEX_RECOVERY_REQUIRED");
  return candidates.sort((a, b) => b.revision - a.revision)[0];
}
// Write-ahead mirror: no file creation until BOTH copies acknowledge the reservation.
// A timeout can leave one newer copy; the next locked request selects that generation.
function persist(files, index) {
  index.revision++;
  const text = JSON.stringify(index);
  if (text.length > 6000000) throw Error("CAPACITY");
  files[1].setContent(text);
  files[0].setContent(text);
}
function privateTree(id) {
  const f = Drive.Files.get(id, { fields: "parents" });
  let pageToken;
  do {
    const page = Drive.Permissions.list(id, {
      fields: "nextPageToken,permissions(type)",
      pageToken: pageToken,
    });
    if (
      (page.permissions || []).some(
        (p) => p.type === "anyone" || p.type === "domain",
      )
    )
      throw Error("PUBLIC_ACCESS");
    pageToken = page.nextPageToken;
  } while (pageToken);
  (f.parents || []).forEach(privateTree);
}
// Run manually once after checking inherited permissions. Reruns never reset an index.
function setup() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    if ((props.getProperty("ARTWORK_SCRIPT_SECRET") || "").length < 32)
      throw Error("Set a secret of at least 32 characters.");
    privateTree(ROOT);
    if (props.getProperty("INDEX_FILE_ID")) {
      readIndex(indexFiles());
      return;
    }
    const index = {
      revision: 0,
      tokens: {},
      codes: {},
      folders: {},
      day: "",
      count: 0,
    };
    function scan(id) {
      list("'" + id + "' in parents").forEach((f) => {
        if (
          f.mimeType === "application/vnd.google-apps.folder" &&
          /^VERA-CUSTOM-/.test(f.name)
        )
          index.folders[f.name] = f.id;
        const m = f.name.match(
          /^(VERA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[1-7])\.(png|jpg|webp)$/,
        );
        if (m) index.codes[m[1]] = true;
        const p = f.appProperties || {};
        if (p.veraToken) {
          if (
            index.tokens[p.veraToken] &&
            index.tokens[p.veraToken].id !== f.id
          )
            throw Error("Duplicate token needs manual review.");
          index.tokens[p.veraToken] = {
            id: f.id,
            code: p.veraCode,
            filename: f.name,
            hash: p.veraHash,
            reference: p.veraReference,
            position: Number(p.veraPosition),
            folder: (f.parents || [])[0],
          };
        }
        if (f.mimeType === "application/vnd.google-apps.folder") scan(f.id);
      });
    }
    scan(ROOT);
    if (Object.keys(index.codes).length > 10000) throw Error("CAPACITY");
    const existing = DriveApp.getFolderById(ROOT).getFilesByName(
      ".vera-artwork-index.json",
    );
    if (existing.hasNext())
      throw Error(
        "Index exists: restore INDEX_FILE_ID instead of recreating it.",
      );
    const file = DriveApp.getFolderById(ROOT).createFile(
      ".vera-artwork-index.json",
      JSON.stringify(index),
      MimeType.PLAIN_TEXT,
    );
    props.setProperty("INDEX_FILE_ID", file.getId());
    const backup = DriveApp.getFolderById(ROOT).createFile(
      ".vera-artwork-index-backup.json",
      JSON.stringify(index),
      MimeType.PLAIN_TEXT,
    );
    props.setProperty("INDEX_BACKUP_ID", backup.getId());
  } finally {
    lock.releaseLock();
  }
}
function doPost(e) {
  let lock;
  let stage = "authenticate";
  try {
    const props = PropertiesService.getScriptProperties(),
      secret = props.getProperty("ARTWORK_SCRIPT_SECRET");
    if (
      !secret ||
      secret.length < 32 ||
      !e.postData ||
      e.postData.contents.length > 2900000
    )
      return json({ ok: false, error: "UNAUTHORIZED" });
    const input = JSON.parse(e.postData.contents);
    if (input.secret !== secret)
      return json({ ok: false, error: "UNAUTHORIZED" });
    if (
      !/^VERA-CUSTOM-[a-f0-9-]{36}$/.test(input.reference) ||
      !/^[a-f0-9-]{36}$/.test(input.token) ||
      !Number.isInteger(input.position) ||
      input.position < 1 ||
      input.position > 7 ||
      !new RegExp(
        "^VERA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-" +
          input.position +
          "$",
      ).test(input.code) ||
      !["png", "jpg", "webp"].includes(input.extension)
    )
      throw Error("INVALID");
    stage = "validate_image";
    const bytes = Utilities.base64Decode(input.data),
      limit = Math.min(
        2097152,
        Math.max(
          1024,
          Number(props.getProperty("ARTWORK_MAX_BYTES") || 1048576) || 1048576,
        ),
      );
    if (!bytes.length || bytes.length > limit) throw Error("SIZE");
    const hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      bytes,
    )
      .map((x) => ("0" + ((x + 256) % 256).toString(16)).slice(-2))
      .join("");
    stage = "acquire_lock";
    lock = LockService.getScriptLock();
    lock.waitLock(30000);
    stage = "check_permissions";
    privateTree(ROOT);
    stage = "read_index";
    const files = indexFiles(),
      index = readIndex(files);
    let entry = index.tokens[input.token];
    if (
      entry &&
      (entry.hash !== hash ||
        entry.reference !== input.reference ||
        entry.position !== input.position)
    )
      throw Error("TOKEN_CONFLICT");
    if (!entry) {
      if (Object.keys(index.tokens).length >= 10000) throw Error("CAPACITY");
      if (index.codes[input.code])
        return json({ ok: false, error: "COLLISION" });
      stage = "check_collision";
      // Indexed exact-name queries, including all descendants, catch externally added files too.
      for (const ext of ["png", "jpg", "webp"]) {
        const matches = list("name = '" + input.code + "." + ext + "'");
        if (matches.some((f) => (f.parents || []).some(beneath)))
          return json({ ok: false, error: "COLLISION" });
      }
      const today = new Date().toISOString().slice(0, 10);
      if (index.day !== today) {
        index.day = today;
        index.count = 0;
      }
      if (
        index.count >=
        Math.min(
          1000,
          Math.max(
            1,
            Number(props.getProperty("ARTWORK_DAILY_LIMIT") || 100) || 100,
          ),
        )
      )
        throw Error("DAILY_LIMIT");
      stage = "request_folder";
      let folder = index.folders[input.reference];
      if (!folder) {
        const matches = list(
          "'" + ROOT + "' in parents and name = '" + input.reference + "'",
        );
        if (
          matches.length > 1 ||
          (matches[0] &&
            matches[0].mimeType !== "application/vnd.google-apps.folder")
        )
          throw Error("FOLDER_CONFLICT");
        folder = matches.length
          ? matches[0].id
          : DriveApp.getFolderById(ROOT).createFolder(input.reference).getId();
        index.folders[input.reference] = folder;
      }
      stage = "reserve_file_id";
      const id = Drive.Files.generateIds({ count: 1, space: "drive" }).ids[0];
      entry = {
        id: id,
        code: input.code,
        filename: input.code + "." + input.extension,
        hash: hash,
        reference: input.reference,
        position: input.position,
        folder: folder,
      };
      index.tokens[input.token] = entry;
      index.codes[input.code] = true;
      index.count++;
      stage = "persist_index";
      persist(files, index);
    }
    if (!beneath(entry.folder)) throw Error("FOLDER_MOVED");
    privateTree(entry.folder);
    // A reserved Drive ID is persisted BEFORE creation: retrying this ID cannot duplicate a file.
    stage = "lookup_saved_file";
    let saved;
    try {
      saved = Drive.Files.get(entry.id, { fields: FIELDS });
    } catch (error) {
      if (!/not found|404/i.test(String(error))) throw error;
    }
    if (!saved) {
      stage = "persist_index";
      persist(files, index);
      stage = "create_image";
      saved = Drive.Files.create(
        {
          id: entry.id,
          name: entry.filename,
          parents: [entry.folder],
          appProperties: {
            veraToken: input.token,
            veraCode: entry.code,
            veraHash: hash,
            veraReference: input.reference,
            veraPosition: String(input.position),
          },
        },
        Utilities.newBlob(
          bytes,
          input.extension === "jpg" ? "image/jpeg" : "image/" + input.extension,
          entry.filename,
        ),
        { fields: FIELDS },
      );
    }
    if (
      !beneath(entry.folder) ||
      saved.trashed ||
      saved.name !== entry.filename ||
      !(saved.parents || []).includes(entry.folder) ||
      saved.appProperties.veraHash !== hash
    )
      throw Error("SAVED_FILE_CHANGED");
    stage = "verify_saved_permissions";
    privateTree(saved.id);
    return json({
      ok: true,
      file: {
        id: saved.id,
        code: entry.code,
        filename: saved.name,
        url: "https://drive.google.com/file/d/" + saved.id + "/view",
        folderUrl: "https://drive.google.com/drive/folders/" + entry.folder,
      },
    });
  } catch (error) {
    // Log only fixed categories/stages and a correlation ID. Never log the raw
    // exception, request, secret, base64, customer fields or tokens.
    const message = String((error && error.message) || error);
    const known = [
      "SETUP_REQUIRED",
      "INDEX_RECOVERY_REQUIRED",
      "CAPACITY",
      "PUBLIC_ACCESS",
      "INVALID",
      "SIZE",
      "TOKEN_CONFLICT",
      "DAILY_LIMIT",
      "FOLDER_CONFLICT",
      "FOLDER_MOVED",
      "SAVED_FILE_CHANGED",
    ];
    const code = known.includes(message)
      ? message
      : /permission|forbidden|authorization|access denied/i.test(message)
        ? "GOOGLE_PERMISSION"
        : /quota|rate limit|too many/i.test(message)
          ? "GOOGLE_QUOTA"
          : /not found|404/i.test(message)
            ? "GOOGLE_NOT_FOUND"
            : /Drive is not defined/i.test(message)
              ? "DRIVE_SERVICE_DISABLED"
              : /timed out|timeout/i.test(message)
                ? "GOOGLE_TIMEOUT"
                : "GOOGLE_OPERATION_FAILED";
    const diagnosticId =
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    console.error(
      JSON.stringify({
        event: "vera_artwork_upload_failed",
        diagnosticId: diagnosticId,
        stage: stage,
        code: code,
      }),
    );
    return json({
      ok: false,
      error: "UPLOAD_FAILED",
      diagnostic: { id: diagnosticId, stage: stage, code: code },
    });
  } finally {
    if (lock) lock.releaseLock();
  }
}

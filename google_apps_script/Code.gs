/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: SISTEM SINKRONISASI PENOMORAN & ARSIP DRIVE SURAT TUGAS
 * Target Spreadsheet: Salinan / Penomoran Pusat Kebijakan Strategis Komdigi
 * Target Tab ID (GID): 599707024 (Register_2026 / Penomoran 2026)
 * Target Folder Drive: https://drive.google.com/drive/folders/1QFvN20eq0bwHM5G2SXJfCZRiQpK0CDF_
 * ============================================================================
 * 
 * PEMBARUAN KOLOM:
 * - Kolom 10: "Link Berkas Word"  <-- LINK PDF DRIVE MASUK KE SINI
 * - Kolom 11: "Link Berkas TTE Pdf" <-- DIBIARKAN KOSONG UNTUK TTE RESMI SIMAYA
 * 
 * CARA UPDATE:
 * 1. Buka Google Sheet target > menu "Ekstensi" > "Apps Script".
 * 2. Hapus seluruh isi default pada Code.gs, lalu paste seluruh script ini.
 * 3. Klik "Simpan" (Ctrl+S).
 * 4. Klik "Terapkan" (Deploy) > "Kelola penerapan" (Manage deployments) > 
 *    Edit (ikon pensil) > Versi: "Versi baru" (New version) > Klik "Terapkan".
 * ============================================================================
 */

// GID target sheet
var TARGET_GID = 599707024;
var FALLBACK_SHEET_NAME = "Register_2026";

// ID Folder Google Drive target untuk arsip surat tugas:
// https://drive.google.com/drive/folders/1QFvN20eq0bwHM5G2SXJfCZRiQpK0CDF_?usp=sharing
var ROOT_FOLDER_ID = "1QFvN20eq0bwHM5G2SXJfCZRiQpK0CDF_";

// Daftar nama bulan bahasa Indonesia
var NAMA_BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * Mencari tab sheet target (berdasarkan GID 599707024 atau nama Register_2026 / Penomoran 2026)
 */
function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  // 1. Cari berdasarkan GID
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() == TARGET_GID) {
      return sheets[i];
    }
  }

  // 2. Cari berdasarkan nama tab
  var sheetByName = ss.getSheetByName(FALLBACK_SHEET_NAME);
  if (sheetByName) {
    return sheetByName;
  }
  
  var sheetAlt = ss.getSheetByName("Penomoran 2026");
  if (sheetAlt) {
    return sheetAlt;
  }

  // 3. Fallback ke sheet pertama
  return sheets[0];
}

/**
 * Mendapatkan atau membuat subfolder bulanan di dalam ROOT_FOLDER_ID.
 * Format: "01 - Januari 2026", "02 - Februari 2026", ..., "10 - Oktober 2026"
 */
function getOrCreateMonthlyFolder(rootFolder, bulanFolderName) {
  var folders = rootFolder.getFoldersByName(bulanFolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return rootFolder.createFolder(bulanFolderName);
}

/**
 * Mendapatkan nomor urut tertinggi yang benar-benar telah terisi (memiliki jenis/hal/tanggal)
 * dan mengabaikan slot nomor kosong yang sudah di-drag ke bawah serta data testing (nomor >= 9000).
 */
function getLatestNomorUrut(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return 0;
  }

  var rangeVals = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var maxUrut = 0;

  for (var i = 0; i < rangeVals.length; i++) {
    var rawNum = rangeVals[i][0];
    var tanggal = (rangeVals[i][1] || "").toString().trim();
    var jenis = (rangeVals[i][2] || "").toString().trim();
    var hal = (rangeVals[i][4] || "").toString().trim();

    if (rawNum !== "" && rawNum !== null && rawNum !== undefined) {
      var num = parseInt(rawNum, 10);
      if (!isNaN(num) && num < 9000 && (jenis !== "" || hal !== "" || tanggal !== "")) {
        if (num > maxUrut) {
          maxUrut = num;
        }
      }
    }
  }

  return maxUrut;
}

/**
 * Mendeteksi pemetaan kolom secara cerdas berdasarkan baris header (Row 1 dan Row 2).
 * Membedakan secara tegas antara:
 * - Kolom "Link Berkas Word" (Kolom 10)
 * - Kolom "Link Berkas TTE Pdf" (Kolom 11)
 */
function getColumnMapping(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 11);
  var row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row2 = sheet.getLastRow() >= 2 ? sheet.getRange(2, 1, 1, lastCol).getValues()[0] : [];

  var colMap = {
    nomor_urut: 1,
    tanggal: 2,
    jenis: 3,
    kepada: 4,
    hal: 5,
    status_ttd: 6,
    topik_tim: 7,
    konseptor: 8,
    status_surat: 9,
    link_word: 10,   // Kolom target "Link Berkas Word"
    link_tte: 11     // Kolom "Link Berkas TTE Pdf"
  };

  for (var c = 0; c < lastCol; c++) {
    var h1 = (row1[c] || "").toString().trim().toUpperCase();
    var h2 = (row2[c] || "").toString().trim().toUpperCase();
    var h = h2 ? (h2 + " " + h1) : h1;

    // Deteksi tegas Kolom Word vs Kolom TTE
    if (h.indexOf("WORD") !== -1 || (h.indexOf("BERKAS") !== -1 && h.indexOf("TTE") === -1 && h.indexOf("PDF") === -1 && h.indexOf("WORD") !== -1)) {
      colMap.link_word = c + 1;
    } else if (h.indexOf("TTE") !== -1 || (h.indexOf("PDF") !== -1 && h.indexOf("LINK") !== -1)) {
      colMap.link_tte = c + 1;
    } else if (h.indexOf("KONSEPTOR") !== -1) {
      colMap.konseptor = c + 1;
    } else if (h.indexOf("STATUS SURAT") !== -1 || (h.indexOf("STATUS") !== -1 && h.indexOf("TTD") === -1)) {
      colMap.status_surat = c + 1;
    } else if (h.indexOf("TOPIK") !== -1) {
      colMap.topik_tim = c + 1;
    } else if (h.indexOf("STATUS TTD") !== -1 || h.indexOf("TTD") !== -1) {
      colMap.status_ttd = c + 1;
    } else if (h.indexOf("HAL") !== -1 || h.indexOf("PERIHAL") !== -1) {
      colMap.hal = c + 1;
    } else if (h.indexOf("KEPADA") !== -1) {
      colMap.kepada = c + 1;
    } else if (h.indexOf("JENIS") !== -1) {
      colMap.jenis = c + 1;
    } else if (h.indexOf("TANGGAL") !== -1 || h.indexOf("TGL") !== -1) {
      colMap.tanggal = c + 1;
    } else if (h.indexOf("NO") !== -1 || h.indexOf("NOMOR") !== -1) {
      colMap.nomor_urut = c + 1;
    }
  }

  // Standar tata letak Register Penomoran Komdigi:
  // Kolom 10 = Link Berkas Word, Kolom 11 = Link Berkas TTE Pdf
  if (!colMap.link_word || colMap.link_word === colMap.nomor_urut) {
    colMap.link_word = 10;
  }
  if (!colMap.link_tte || colMap.link_tte === colMap.nomor_urut) {
    colMap.link_tte = 11;
  }

  // Tautan yang di-generate sistem WAJIB masuk ke link_word (Kolom 10)
  colMap.link_berkas = colMap.link_word;

  colMap.max_col = Math.max(
    colMap.nomor_urut,
    colMap.tanggal,
    colMap.jenis,
    colMap.kepada,
    colMap.hal,
    colMap.status_ttd,
    colMap.topik_tim,
    colMap.konseptor,
    colMap.status_surat,
    colMap.link_word,
    colMap.link_tte,
    11
  );

  return colMap;
}

/**
 * Memindahkan tautan yang terlanjur masuk ke kolom TTE (Kolom 11)
 * kembali ke kolom "Link Berkas Word" (Kolom 10)
 */
function fixMisplacedLinks() {
  var sheet = getTargetSheet();
  var colMap = getColumnMapping(sheet);
  var lastRow = sheet.getLastRow();
  var fixedCount = 0;

  if (lastRow > 1) {
    for (var r = 2; r <= lastRow; r++) {
      var wordCell = sheet.getRange(r, colMap.link_word);
      var tteCell = sheet.getRange(r, colMap.link_tte);
      var wordVal = wordCell.getValue().toString().trim();
      var tteVal = tteCell.getValue().toString().trim();

      // Jika di kolom TTE ada link drive tapi di kolom Word kosong, pindahkan!
      if (tteVal.indexOf("drive.google.com") !== -1 && wordVal === "") {
        wordCell.setValue(tteVal);
        tteCell.setValue("");
        fixedCount++;
      }
    }
  }
  return fixedCount;
}

/**
 * Menghandle HTTP GET
 */
function doGet(e) {
  try {
    var sheet = getTargetSheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "get_latest_number";

    if (action === "ping") {
      return createJsonResponse({
        status: "ok",
        message: "Google Apps Script Surat Tugas PUSAKA aktif dan terhubung.",
        sheet_name: sheet.getName(),
        sheet_id: sheet.getSheetId(),
        root_folder_id: ROOT_FOLDER_ID
      });
    }

    if (action === "fix_links") {
      var fixed = fixMisplacedLinks();
      return createJsonResponse({
        status: "success",
        message: "Berhasil memindahkan " + fixed + " link ke kolom Link Berkas Word.",
        fixed_count: fixed
      });
    }

    if (action === "get_headers") {
      var lastCol = sheet.getLastColumn();
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      return createJsonResponse({
        status: "success",
        sheet_name: sheet.getName(),
        headers: headers,
        last_column: lastCol
      });
    }

    if (action === "get_recent") {
      var limit = 25;
      var lastRow = sheet.getLastRow();
      var startRow = Math.max(2, lastRow - limit + 1);
      var numRows = lastRow - startRow + 1;
      var rows = [];

      var colMap = getColumnMapping(sheet);

      if (numRows > 0) {
        var fetchCols = Math.max(colMap.max_col, 11);
        var rangeVals = sheet.getRange(startRow, 1, numRows, fetchCols).getValues();
        for (var i = 0; i < rangeVals.length; i++) {
          rows.push({
            nomor_urut: rangeVals[i][colMap.nomor_urut - 1],
            tanggal: rangeVals[i][colMap.tanggal - 1],
            jenis: rangeVals[i][colMap.jenis - 1],
            kepada: rangeVals[i][colMap.kepada - 1],
            hal: rangeVals[i][colMap.hal - 1],
            status_ttd: rangeVals[i][colMap.status_ttd - 1],
            topik_tim: rangeVals[i][colMap.topik_tim - 1],
            konseptor: rangeVals[i][colMap.konseptor - 1] || "",
            status_surat: rangeVals[i][colMap.status_surat - 1] || "",
            link_berkas_word: rangeVals[i][colMap.link_word - 1] || "",
            link_berkas_tte: rangeVals[i][colMap.link_tte - 1] || ""
          });
        }
      }

      var maxUrut = getLatestNomorUrut(sheet);
      return createJsonResponse({
        status: "success",
        sheet_name: sheet.getName(),
        sheet_id: sheet.getSheetId(),
        latest_nomor_urut: maxUrut,
        next_nomor_urut: maxUrut + 1,
        total_rows: lastRow,
        data: rows
      });
    }

    // Default: get_latest_number
    var latest = getLatestNomorUrut(sheet);
    return createJsonResponse({
      status: "success",
      sheet_name: sheet.getName(),
      sheet_id: sheet.getSheetId(),
      latest_nomor_urut: maxUrut || latest,
      next_nomor_urut: (maxUrut || latest) + 1,
      total_rows: sheet.getLastRow(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Menghandle HTTP POST:
 * 1. Simpan PDF ke Google Drive dalam folder bulanan
 * 2. Masukkan link PDF ke kolom "Link Berkas Word" (Kolom 10)
 * 3. Kosongkan kolom "Link Berkas TTE Pdf" (Kolom 11) untuk TTE Simaya
 */
function doPost(e) {
  try {
    var sheet = getTargetSheet();
    var data = null;

    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    if (!data) {
      return createJsonResponse({
        status: "error",
        message: "Payload data kosong atau format JSON tidak valid."
      });
    }

    var nomorUrut = parseInt(data.nomor_urut, 10);
    var tanggal = data.tanggal || "";
    var jenis = data.jenis || "ST";
    var kepada = data.kepada || "";
    var hal = data.hal || "";
    var statusTtd = data.status_ttd || "Kapus";
    var topikTim = data.topik_tim || "TU";
    var konseptor = data.konseptor || "";
    var statusSurat = data.status_surat || "OK";

    if (isNaN(nomorUrut) || nomorUrut <= 0) {
      return createJsonResponse({
        status: "error",
        message: "nomor_urut wajib berupa bilangan bulat positif."
      });
    }

    // =========================================================================
    // 1. SIMPAN PDF KE GOOGLE DRIVE (TERPISAH PER BULAN)
    // =========================================================================
    var fileUrl = "";
    var fileDriveId = "";
    var driveErrorMsg = "";

    if (data.pdf_base64) {
      try {
        var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);

        // Format nama folder bulan: "10 - Oktober 2026"
        var bulanFolder = data.bulan_folder;
        if (!bulanFolder) {
          var now = new Date();
          var mIdx = now.getMonth();
          var mNum = (mIdx + 1 < 10 ? "0" : "") + (mIdx + 1);
          bulanFolder = mNum + " - " + NAMA_BULAN_INDO[mIdx] + " " + now.getFullYear();
        }

        var targetMonthFolder = getOrCreateMonthlyFolder(rootFolder, bulanFolder);

        // Nama file PDF resmi
        var fileName = data.pdf_filename || ("ST-" + nomorUrut + ".pdf");
        var pdfBlob = Utilities.newBlob(
          Utilities.base64Decode(data.pdf_base64),
          "application/pdf",
          fileName
        );

        // Hapus file lama jika nomor/nama sama (mencegah duplikat saat sync ulang)
        var existingFiles = targetMonthFolder.getFilesByName(fileName);
        while (existingFiles.hasNext()) {
          existingFiles.next().setTrashed(true);
        }

        var createdFile = targetMonthFolder.createFile(pdfBlob);

        // Berikan hak akses View
        try {
          createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {
          Logger.log("Sharing permission warning: " + shareErr.toString());
        }

        fileUrl = createdFile.getUrl();
        fileDriveId = createdFile.getId();

      } catch (driveErr) {
        driveErrorMsg = driveErr.toString();
        Logger.log("Gagal mengunggah PDF ke Google Drive: " + driveErrorMsg);
      }
    }

    // =========================================================================
    // 2. TULISKAN KE SPREADSHEET (PERSIS DI KOLOM LINK BERKAS WORD)
    // =========================================================================
    var colMap = getColumnMapping(sheet);
    var totalCols = Math.max(colMap.max_col, 11);

    // Cek apakah nomor urut sudah ada di sheet (idempotent update)
    var lastRow = sheet.getLastRow();
    var targetRow = -1;

    if (lastRow > 1) {
      var colA = sheet.getRange(2, colMap.nomor_urut, lastRow - 1, 1).getValues();
      for (var r = 0; r < colA.length; r++) {
        if (parseInt(colA[r][0], 10) === nomorUrut) {
          targetRow = r + 2;
          break;
        }
      }
    }

    // Jika baris sudah ada, baca dulu nilai lama agar tidak menimpa kolom lain yang sudah diisi manual
    var rowValues = new Array(totalCols);
    for (var i = 0; i < totalCols; i++) {
      rowValues[i] = "";
    }

    if (targetRow > 0) {
      var existingRowVals = sheet.getRange(targetRow, 1, 1, totalCols).getValues()[0];
      for (var i = 0; i < totalCols; i++) {
        rowValues[i] = existingRowVals[i] !== undefined ? existingRowVals[i] : "";
      }
    }

    rowValues[colMap.nomor_urut - 1] = nomorUrut;
    rowValues[colMap.tanggal - 1] = tanggal;
    rowValues[colMap.jenis - 1] = jenis;
    rowValues[colMap.kepada - 1] = kepada;
    rowValues[colMap.hal - 1] = hal;
    rowValues[colMap.status_ttd - 1] = statusTtd;
    rowValues[colMap.topik_tim - 1] = topikTim;
    rowValues[colMap.konseptor - 1] = konseptor;
    rowValues[colMap.status_surat - 1] = statusSurat;

    // WAJIB: Isi link ke Kolom "Link Berkas Word" (Kolom 10)
    if (fileUrl) {
      rowValues[colMap.link_word - 1] = fileUrl;
      // Jika sebelumnya kolom TTE (Kolom 11) tidak sengaja terisi link Word ini, kosongkan kolom TTE!
      if (rowValues[colMap.link_tte - 1] === fileUrl) {
        rowValues[colMap.link_tte - 1] = "";
      }
    }

    if (targetRow > 0) {
      sheet.getRange(targetRow, 1, 1, totalCols).setValues([rowValues]);
      return createJsonResponse({
        status: "success",
        action: "updated",
        row_index: targetRow,
        nomor_urut: nomorUrut,
        column_target: "Link Berkas Word (Kolom " + colMap.link_word + ")",
        file_url: fileUrl,
        drive_error: driveErrorMsg,
        message: "Baris nomor urut " + nomorUrut + " berhasil diperbarui di kolom 'Link Berkas Word'."
      });
    } else {
      sheet.appendRow(rowValues);
      var newLastRow = sheet.getLastRow();
      return createJsonResponse({
        status: "success",
        action: "appended",
        row_index: newLastRow,
        nomor_urut: nomorUrut,
        column_target: "Link Berkas Word (Kolom " + colMap.link_word + ")",
        file_url: fileUrl,
        drive_error: driveErrorMsg,
        message: "Surat tugas nomor urut " + nomorUrut + " berhasil ditambahkan di kolom 'Link Berkas Word'."
      });
    }

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Format output JSON response
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

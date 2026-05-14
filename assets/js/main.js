/**
 * MAIN APPLICATION LOGIC
 * Excel Photo Inserter — Telkom Gedung Management
 */

// Register FilePond plugins (Removed FilePondPluginFileValidateType to allow manual validation)
FilePond.registerPlugin(
    FilePondPluginImagePreview
);

/**
 * STATE MANAGEMENT
 */
const state = {
    currentStep: 1,
    excelFile: null,
    workbook: null,
    sheets: [], // { name, activities: [{ row, id, text, photos: [] }] }
    folders: [], // { id, name, images: [{ name, data, type }] }
    mapping: {}, // sheetName -> folderId
    selectedPhotos: {}, // sheetName -> activityRow -> [imageIndex, ...]
    imagesClearedConfirmed: false,
    pdfDoc: null,
    customPhotoContext: null // { sheetName, row }
};

/**
 * UI ELEMENTS
 */
const elements = {
    stepper: document.getElementById('stepper'),
    steps: document.querySelectorAll('.step'),
    contents: document.querySelectorAll('.step-content'),
    loading: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    
    // Step 1
    excelInput: document.getElementById('excel-input'),
    excelInfo: document.getElementById('excel-info'),
    excelFilename: document.getElementById('excel-filename'),
    excelDetails: document.getElementById('excel-details'),
    btnNext1: document.getElementById('btn-next-1'),
    
    // Step 2
    imageInput: document.getElementById('image-input'),
    folderList: document.getElementById('folder-list'),
    btnNext2: document.getElementById('btn-next-2'),
    btnPrev2: document.getElementById('btn-prev-2'),
    
    // Step 3
    mappingBody: document.getElementById('mapping-body'),
    btnNext3: document.getElementById('btn-next-3'),
    btnPrev3: document.getElementById('btn-prev-3'),
    
    // Step 4
    sheetTabs: document.getElementById('sheet-tabs'),
    activityContainer: document.getElementById('activity-container'),
    overallProgress: document.getElementById('overall-progress'),
    btnNext4: document.getElementById('btn-next-4'),
    btnPrev4: document.getElementById('btn-prev-4'),

    // Step 5
    previewTabs: document.getElementById('preview-tabs'),
    previewContainer: document.getElementById('preview-container'),
    btnGenerate: document.getElementById('btn-generate'),
    btnDownloadAgain: document.getElementById('btn-download-again'),
    btnPrev5: document.getElementById('btn-prev-5'),

    // Step 6
    finalFilename: document.getElementById('final-filename'),
    hoverPreview: document.getElementById('hover-preview'),
    hoverPreviewImg: document.getElementById('hover-preview-img'),
    
    btnDownloadTemplate: document.getElementById('btn-download-template'),
    customPhotoInput: document.getElementById('custom-photo-input'),
};

/**
 * FILEPOND INITIALIZATION
 */
const excelPond = FilePond.create(elements.excelInput, {
    labelIdle: 'Seret & letakkan file Excel atau <span class="filepond--label-action">Telusuri</span>',
    onaddfile: (error, file) => {
        console.log('FilePond: File added', file);
        if (error) {
            console.error('FilePond Error:', error);
            return;
        }
        
        const fileName = file.file.name;
        const fileType = file.file.type;
        console.log(`Checking file: ${fileName} (Type: ${fileType})`);
        
        const isExcel = fileName.toLowerCase().endsWith('.xlsx');
        if (!isExcel) {
            console.warn('File rejected: Not .xlsx');
            showToast('Hanya mendukung file .xlsx', 'error');
            excelPond.removeFile(file.id);
            return;
        }
        
        console.log('File accepted, starting handleExcelFile...');
        handleExcelFile(file.file);
        
        // Remove from FilePond UI to keep it clean
        setTimeout(() => excelPond.removeFile(file.id), 1000);
    },
    onremovefile: () => {
        console.log('FilePond: File removed');
    }
});

const imagePond = FilePond.create(elements.imageInput, {
    labelIdle: 'Seret & letakkan folder/ZIP atau <span class="filepond--label-action">Telusuri</span>',
    allowMultiple: true,
    allowDirectoryUpload: true,
    itemInsertLocation: 'after',
    onaddfile: async (error, file) => {
        console.log('FilePond Image: File added', file?.file?.name);
        if (error) {
            console.error('FilePond Image Error:', error);
            return;
        }

        const isValid = /\.(jpg|jpeg|png|webp|zip)$/i.test(file.file.name);
        if (!isValid) {
            console.warn(`File rejected: ${file.file.name} is not a supported format`);
            showToast('Format file tidak didukung', 'error');
            imagePond.removeFile(file.id);
            return;
        }

        console.log(`Processing file: ${file.file.name}...`);
        showLoading('Memproses file...');
        await handleImageUpload(file.file);
        hideLoading();
        console.log(`Finished processing: ${file.file.name}`);
        
        // Remove from FilePond UI immediately after processing
        imagePond.removeFile(file.id);
    }
});

/**
 * UTILS
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'error' ? 'error' : (type === 'success' ? 'check_circle' : 'info');
    toast.innerHTML = `<span class="material-icons-round">${icon}</span> <span>${message}</span>`;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showLoading(text) {
    elements.loadingText.innerText = text || 'Sedang memproses...';
    elements.loading.style.display = 'flex';
}

function hideLoading() {
    elements.loading.style.display = 'none';
}

function goToStep(step) {
    console.log(`Force Moving to Step ${step}`);
    state.currentStep = step;
    
    // Update Progress Bar
    elements.steps.forEach(s => {
        const sNum = parseInt(s.dataset.step);
        s.classList.toggle('active', sNum === step);
        s.classList.toggle('completed', sNum < step);
    });

    // Update Content Visibility
    elements.contents.forEach(c => {
        const isTarget = c.id === `step-${step}`;
        c.classList.toggle('active', isTarget);
        
        // Tambahkan manipulasi display langsung agar lebih pasti pindah
        if (isTarget) {
            c.style.display = 'block';
            console.log(`- Element ${c.id} set to block`);
        } else {
            c.style.display = 'none';
        }
    });

    window.scrollTo(0, 0);

    if (step === 3) renderMapping();
    if (step === 4) renderActivities();
    if (step === 5) renderPreview();
}

/**
 * STEP 1: EXCEL UPLOAD
 */
async function handleExcelFile(file) {
    console.log('handleExcelFile: Starting FileReader...');
    showLoading('Membaca file Excel...');
    try {
        state.excelFile = file;
        const reader = new FileReader();
        reader.onload = async (e) => {
            console.log('FileReader: Load complete');
            const buffer = e.target.result;
            const workbook = new ExcelJS.Workbook();
            
            console.log('ExcelJS: Loading workbook buffer...');
            await workbook.xlsx.load(buffer);
            state.workbook = workbook;
            const sheets = [];
            workbook.eachSheet(sheet => {
                console.log(`Processing sheet: ${sheet.name}`);
                const activities = [];
                let title = sheet.getRow(1).getCell(1).value || '';
                let subtitle = sheet.getRow(2).getCell(1).value || '';
                
                let headerFound = false;
                let headerRowNumber = 4; // Default as per template

                // Cari baris header secara dinamis jika tidak di baris 4
                sheet.eachRow((row, rowNumber) => {
                    if (headerFound) {
                        const activityText = row.getCell(2).value;
                        const volume = row.getCell(6).value;

                        if (activityText && activityText.toString().trim().length > 0) {
                            activities.push({
                                row: rowNumber,
                                text: activityText.toString().trim(),
                                volume: volume || '',
                                satuan: '',
                                photos: []
                            });
                        }
                    } else {
                        // Cek apakah ini baris header
                        const cell2 = (row.getCell(2).value || '').toString().toLowerCase();
                        if (cell2.includes('aktivitas') || cell2.includes('aktifitas')) {
                            headerFound = true;
                            headerRowNumber = rowNumber;
                            console.log(`- Header found at row ${rowNumber}`);
                        }
                    }
                });

                // Jika header tidak ditemukan secara dinamis, coba tebak mulai dari baris 2
                if (!headerFound) {
                    console.log('- Header not found, falling back to Row 2+');
                    sheet.eachRow((row, rowNumber) => {
                        if (rowNumber >= 2) {
                            const actText = row.getCell(2).value;
                            if (actText && actText.toString().trim().length > 2) {
                                activities.push({
                                    row: rowNumber,
                                    text: actText.toString().trim(),
                                    volume: row.getCell(6).value || '',
                                    satuan: '',
                                    photos: []
                                });
                            }
                        }
                    });
                }
                
                if (activities.length > 0) {
                    sheets.push({
                        name: sheet.name,
                        title: title,
                        subtitle: subtitle,
                        activities: activities
                    });
                    console.log(`- Successfully extracted ${activities.length} rows`);
                }
            });

            if (sheets.length === 0) {
                console.warn('Excel Parsing: No activities found in any sheet.');
                showToast('Maaf, tidak ditemukan data aktivitas di kolom B. Pastikan file Excel benar.', 'error');
                excelPond.removeFile();
                hideLoading();
                return;
            }

            state.sheets = sheets;
            elements.excelFilename.innerText = file.name;
            elements.excelDetails.innerText = `${sheets.length} Sheet ditemukan • ${sheets.reduce((acc, s) => acc + s.activities.length, 0)} Aktivitas`;
            elements.excelInfo.classList.remove('hidden');
            elements.btnNext1.disabled = false;
            showToast('Excel berhasil dimuat', 'success');
            hideLoading();
        };
        reader.readAsArrayBuffer(file);
    } catch (err) {
        console.error(err);
        showToast('Gagal membaca file Excel', 'error');
        hideLoading();
    }
}

elements.btnNext1.onclick = () => goToStep(2);

/**
 * DOWNLOAD TEMPLATE
 */
elements.btnDownloadTemplate.onclick = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        
        const createSheet = (sheetName, identitasGedung) => {
            const sheet = workbook.addWorksheet(sheetName);
            const headerFill = { type: 'pattern', pattern:'solid', fgColor: { argb: 'FFE31937' } };
            const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
            const centerAlignment = { vertical: 'middle', horizontal: 'center' };

            // Baris 1: Judul Utama
            sheet.mergeCells('A1:F1');
            const titleCell = sheet.getCell('A1');
            titleCell.value = 'PELAKSANAAN PEKERJAAN PENGELOLAAN GEDUNG TELKOM 2025';
            titleCell.font = { size: 12, bold: true };
            titleCell.alignment = centerAlignment;

            // Baris 2: Sub Judul (Identitas Gedung)
            sheet.mergeCells('A2:F2');
            const subTitleCell = sheet.getCell('A2');
            subTitleCell.value = identitasGedung;
            subTitleCell.font = { size: 11, bold: true };
            subTitleCell.alignment = centerAlignment;

            // Baris 4: Header Tabel
            const headerRow = sheet.getRow(4);
            headerRow.values = ['NO', 'AKTIFITAS PEKERJAAN', 'FOTO PEKERJAAN', '', '', 'FREKUENSI'];
            sheet.mergeCells('C4:E4');
            
            ['A4', 'B4', 'C4', 'F4'].forEach(ref => {
                const cell = sheet.getCell(ref);
                cell.fill = headerFill;
                cell.font = headerFont;
                cell.alignment = centerAlignment;
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });

            // Baris 5: Data Contoh
            const sampleData = [
                [1, 'Pembersihan dinding', '', '', '', '1x Per 2 Minggu'],
                [2, 'Pembersihan dan perawatan lantai', '', '', '', '1x Per Minggu'],
                [3, 'Pembersihan plafon', '', '', '', '1x Per Bulan']
            ];
            
            sampleData.forEach((data, i) => {
                const rowNum = 5 + i;
                const row = sheet.getRow(rowNum);
                row.values = data;
                sheet.mergeCells(`C${rowNum}:E${rowNum}`);
                row.getCell(1).alignment = centerAlignment;
                row.getCell(6).alignment = centerAlignment;
                
                // Add borders
                ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
                    row.getCell(col).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                });
                row.height = 60; // Agar mirip screenshot yang ada foto
            });

            sheet.getColumn(1).width = 8;
            sheet.getColumn(2).width = 40;
            sheet.getColumn(3).width = 15;
            sheet.getColumn(4).width = 15;
            sheet.getColumn(5).width = 15;
            sheet.getColumn(6).width = 20;
        };

        createSheet('KELAS 4 OFFICE', '(5445101601)-(STO NEGARA SINGARAJA)');
        createSheet('KELAS 4 IDLE', '(5445101602)-(STO NEGARA SINGARAJA)');

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Template_Laporan_Gedung.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('Template berhasil didownload', 'success');
    } catch (err) {
        console.error(err);
        showToast('Gagal membuat template', 'error');
    }
};

/**
 * STEP 2: IMAGE UPLOAD
 */
async function handleImageUpload(file) {
    try {
        if (file.name.endsWith('.zip')) {
            const zip = await JSZip.loadAsync(file);
            const folderMap = {};
            
            const entries = Object.entries(zip.files).filter(([path, entry]) => 
                !entry.dir && /\.(jpg|jpeg|png|webp)$/i.test(path.split('/').pop())
            );
            
            const total = entries.length;
            let current = 0;

            for (const [path, zipEntry] of entries) {
                current++;
                const name = path.split('/').pop();
                showLoading(`Kompresi Gambar (${current}/${total}): ${name}`);

                const parts = path.split('/');
                const folderName = parts.length > 1 ? parts[parts.length - 2] : 'Root';
                
                if (!folderMap[folderName]) folderMap[folderName] = [];
                
                const blob = await zipEntry.async('blob');
                const compressedBlob = await compressImage(new File([blob], name, { type: blob.type }));
                folderMap[folderName].push({ name, data: compressedBlob, type: compressedBlob.type });
            }

            for (const [name, images] of Object.entries(folderMap)) {
                state.folders.push({ id: Date.now() + Math.random(), name, images });
            }
        } else if (/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
            // Tracking progress for individual files (e.g. from folder upload)
            state.processingCount = (state.processingCount || 0) + 1;
            showLoading(`Mengompres: ${file.name}...`);
            
            const compressedBlob = await compressImage(file);
            
            const path = file.webkitRelativePath || '';
            const parts = path.split('/');
            const folderName = parts.length > 1 ? parts[0] : 'Uploads';

            let folder = state.folders.find(f => f.name === folderName);
            if (!folder) {
                folder = { id: Date.now() + Math.random(), name: folderName, images: [] };
                state.folders.push(folder);
            }
            folder.images.push({ name: file.name, data: compressedBlob, type: compressedBlob.type });
            
            state.processingCount--;
            if (state.processingCount <= 0) hideLoading();
        }

        renderFolders();
        elements.btnNext2.disabled = state.folders.length === 0;
    } catch (err) {
        console.error(err);
        showToast('Gagal memproses file', 'error');
        if (state.processingCount) state.processingCount--;
    }
}

function renderFolders() {
    elements.folderList.innerHTML = '';
    state.folders.forEach(folder => {
        const card = document.createElement('div');
        card.className = 'folder-card';
        
        let thumbsHtml = '';
        folder.images.slice(0, 3).forEach(img => {
            const url = URL.createObjectURL(img.data);
            thumbsHtml += `<img src="${url}" class="preview-thumb">`;
        });

        card.innerHTML = `
            <div class="folder-header">
                <span class="material-icons-round folder-icon">folder</span>
                <div style="overflow: hidden;">
                    <div class="folder-name">${folder.name}</div>
                    <div class="folder-info">${folder.images.length} Gambar</div>
                </div>
            </div>
            <div class="folder-previews">${thumbsHtml}</div>
            <button class="btn btn-secondary" style="width: 100%; margin-top: 1rem; padding: 0.5rem;" onclick="removeFolder(${folder.id})">Hapus</button>
        `;
        elements.folderList.appendChild(card);
    });
}

window.removeFolder = (id) => {
    state.folders = state.folders.filter(f => f.id !== id);
    renderFolders();
    elements.btnNext2.disabled = state.folders.length === 0;
};

elements.btnPrev2.onclick = () => goToStep(1);
elements.btnNext2.onclick = () => goToStep(3);

/**
 * STEP 3: MAPPING
 */
function renderMapping() {
    elements.mappingBody.innerHTML = '';
    state.sheets.forEach(sheet => {
        const row = document.createElement('tr');
        
        let options = `<option value="">-- Pilih Folder --</option>`;
        state.folders.forEach(folder => {
            const selected = state.mapping[sheet.name] == folder.id ? 'selected' : '';
            options += `<option value="${folder.id}" ${selected}>${folder.name} (${folder.images.length} foto)</option>`;
        });

        row.innerHTML = `
            <td style="font-weight: 600;">${sheet.name}</td>
            <td class="text-center"><span class="material-icons-round" style="color: var(--gray-400);">arrow_forward</span></td>
            <td>
                <select class="mapping-select" onchange="updateMapping('${sheet.name}', this.value)">
                    ${options}
                </select>
            </td>
        `;
        elements.mappingBody.appendChild(row);
    });
    validateMapping();
}

window.updateMapping = (sheetName, folderId) => {
    state.mapping[sheetName] = folderId;
    validateMapping();
};

function validateMapping() {
    const allMapped = state.sheets.every(s => state.mapping[s.name]);
    elements.btnNext3.disabled = !allMapped;
}

elements.btnPrev3.onclick = () => goToStep(2);
elements.btnNext3.onclick = () => goToStep(4);

/**
 * STEP 4: PHOTO SELECTION
 */
let activeSheetTab = '';

function renderActivities() {
    if (!activeSheetTab && state.sheets.length > 0) activeSheetTab = state.sheets[0].name;
    
    elements.sheetTabs.innerHTML = '';
    state.sheets.forEach(sheet => {
        const tab = document.createElement('div');
        tab.className = `tab ${activeSheetTab === sheet.name ? 'active' : ''}`;
        tab.innerText = sheet.name;
        tab.onclick = () => {
            activeSheetTab = sheet.name;
            renderActivities();
        };
        elements.sheetTabs.appendChild(tab);
    });

    const sheet = state.sheets.find(s => s.name === activeSheetTab);
    const folderId = state.mapping[activeSheetTab];
    const folder = state.folders.find(f => f.id == folderId);
    
    elements.activityContainer.innerHTML = '';
    if (!sheet || !folder) return;

    sheet.activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        const selectedIndices = state.selectedPhotos[sheet.name]?.[activity.row] || [];
        
        let photoGridHtml = '';
        folder.images.forEach((img, idx) => {
            const isSelected = selectedIndices.includes(idx);
            const url = URL.createObjectURL(img.data);
            photoGridHtml += `
                <div class="photo-thumb ${isSelected ? 'selected' : ''}" 
                     onclick="togglePhoto('${sheet.name}', ${activity.row}, ${idx})"
                     onmouseenter="showHoverPreview(event, '${url}')"
                     onmouseleave="hideHoverPreview()"
                     onmousemove="moveHoverPreview(event)">
                    <img src="${url}" loading="lazy">
                </div>
            `;
        });

        item.innerHTML = `
            <div class="activity-header">
                <div class="activity-title">${activity.text}</div>
                <div class="activity-meta">
                    <span class="badge-count">${selectedIndices.length} foto</span>
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="triggerCustomPhoto('${sheet.name}', ${activity.row})">
                        <span class="material-icons-round" style="font-size: 14px;">add_a_photo</span> Tambah Foto
                    </button>
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="clearPhotos('${sheet.name}', ${activity.row})">Reset</button>
                </div>
            </div>
            <div class="photo-grid">${photoGridHtml}</div>
        `;
        elements.activityContainer.appendChild(item);
    });

    updateProgress();
}

window.togglePhoto = (sheetName, row, imgIdx) => {
    if (!state.selectedPhotos[sheetName]) state.selectedPhotos[sheetName] = {};
    if (!state.selectedPhotos[sheetName][row]) state.selectedPhotos[sheetName][row] = [];
    
    const list = state.selectedPhotos[sheetName][row];
    const idx = list.indexOf(imgIdx);
    if (idx > -1) list.splice(idx, 1);
    else list.push(imgIdx);
    
    renderActivities();
};

window.clearPhotos = (sheetName, row) => {
    if (state.selectedPhotos[sheetName]) {
        state.selectedPhotos[sheetName][row] = [];
    }
    renderActivities();
};

/**
 * CUSTOM PHOTO HANDLING
 */
window.triggerCustomPhoto = (sheetName, row) => {
    state.customPhotoContext = { sheetName, row };
    elements.customPhotoInput.click();
};

elements.customPhotoInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || !state.customPhotoContext) return;

    showLoading('Memproses foto...');
    try {
        const compressedBlob = await compressImage(file);
        const folderId = state.mapping[state.customPhotoContext.sheetName];
        let folder = state.folders.find(f => f.id == folderId);
        
        if (!folder) {
            // Create a "Custom" folder if no mapping exists yet
            folder = { id: 'custom_' + Date.now(), name: 'Foto Tambahan', images: [] };
            state.folders.push(folder);
            state.mapping[state.customPhotoContext.sheetName] = folder.id;
        }

        const newImage = { 
            name: 'Manual_' + file.name, 
            data: compressedBlob, 
            type: compressedBlob.type,
            isCustom: true 
        };
        
        folder.images.push(newImage);
        const newIdx = folder.images.length - 1;

        // Auto-select the newly added photo
        const sheetName = state.customPhotoContext.sheetName;
        const row = state.customPhotoContext.row;
        if (!state.selectedPhotos[sheetName]) state.selectedPhotos[sheetName] = {};
        if (!state.selectedPhotos[sheetName][row]) state.selectedPhotos[sheetName][row] = [];
        state.selectedPhotos[sheetName][row].push(newIdx);

        showToast('Foto berhasil ditambahkan', 'success');
        renderActivities();
    } catch (err) {
        console.error(err);
        showToast('Gagal memproses foto', 'error');
    } finally {
        hideLoading();
        elements.customPhotoInput.value = ''; // Reset input
        state.customPhotoContext = null;
    }
};

/**
 * HOVER PREVIEW FUNCTIONS
 */
window.showHoverPreview = (e, url) => {
    elements.hoverPreviewImg.src = url;
    elements.hoverPreview.style.display = 'block';
    moveHoverPreview(e);
};

window.moveHoverPreview = (e) => {
    const x = e.clientX + 20;
    const y = e.clientY + 20;
    
    const previewWidth = 400;
    const previewHeight = 400;
    
    let finalX = x;
    let finalY = y;
    
    if (x + previewWidth > window.innerWidth) finalX = e.clientX - previewWidth - 20;
    if (y + previewHeight > window.innerHeight) finalY = e.clientY - previewHeight - 20;
    
    elements.hoverPreview.style.left = finalX + 'px';
    elements.hoverPreview.style.top = finalY + 'px';
};

window.hideHoverPreview = () => {
    elements.hoverPreview.style.display = 'none';
    elements.hoverPreviewImg.src = '';
};

function updateProgress() {
    let total = 0;
    let done = 0;
    state.sheets.forEach(s => {
        total += s.activities.length;
        s.activities.forEach(a => {
            if (state.selectedPhotos[s.name]?.[a.row]?.length > 0) done++;
        });
    });
    elements.overallProgress.innerText = `${done} / ${total} Aktivitas Terisi`;
}

elements.btnPrev4.onclick = () => goToStep(3);
elements.btnNext4.onclick = () => goToStep(5);

/**
 * STEP 5: PREVIEW
 */
let activePreviewTab = '';

function renderPreview() {
    if (!activePreviewTab && state.sheets.length > 0) activePreviewTab = state.sheets[0].name;

    elements.previewTabs.innerHTML = '';
    state.sheets.forEach(sheet => {
        const tab = document.createElement('div');
        tab.className = `tab ${activePreviewTab === sheet.name ? 'active' : ''}`;
        tab.innerText = sheet.name;
        tab.onclick = () => {
            activePreviewTab = sheet.name;
            renderPreview();
        };
        elements.previewTabs.appendChild(tab);
    });

    const sheet = state.sheets.find(s => s.name === activePreviewTab);
    const folderId = state.mapping[activePreviewTab];
    const folder = state.folders.find(f => f.id == folderId);
    
    elements.previewContainer.innerHTML = '';
    if (!sheet) return;

    sheet.activities.forEach(activity => {
        const selectedIndices = state.selectedPhotos[sheet.name]?.[activity.row] || [];
        
        const colC = [];
        const colD = [];
        const nC = Math.ceil(selectedIndices.length / 2);
        selectedIndices.forEach((idx, i) => {
            const img = folder.images[idx];
            const url = URL.createObjectURL(img.data);
            const imgHtml = `<img src="${url}" class="preview-img">`;
            if (i < nC) colC.push(imgHtml);
            else colD.push(imgHtml);
        });

        const row = document.createElement('div');
        row.className = 'preview-row';
        row.innerHTML = `
            <div class="preview-activity">
                <div style="font-size: 0.75rem; color: var(--gray-500);">Baris ${activity.row} | Frekuensi: ${activity.volume} ${activity.satuan}</div>
                <div style="font-weight: 600;">${activity.text}</div>
            </div>
            <div class="preview-col">
                <div style="font-size: 0.65rem; color: var(--gray-400);">Dokumentasi</div>
                ${colC.length || colD.length ? [...colC, ...colD].join('') : '<div class="no-photo">Kosong</div>'}
            </div>
        `;
        elements.previewContainer.appendChild(row);
    });
}

elements.btnPrev5.onclick = () => goToStep(4);

/**
 * STEP 6: GENERATE PDF
 */
elements.btnGenerate.onclick = async () => {
    if (state.sheets.length === 0) return;

    showLoading('Menyusun laporan PDF... Sedang memproses gambar agar muat satu lembar per sheet.');
    
    try {
        const { jsPDF } = window.jspdf;
        const telkomRed = [227, 25, 55];
        const pageWidth = 210;
        const pageHeight = 297;

        const blobToDataURL = (blob) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        };

        for (let sIndex = 0; sIndex < state.sheets.length; sIndex++) {
            const sheet = state.sheets[sIndex];
            
            // Buat PDF Baru untuk setiap Sheet
            const doc = new jsPDF('p', 'mm', 'a4');

            // 1. Header (15mm)
            doc.setFillColor(...telkomRed);
            doc.rect(0, 0, pageWidth, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(sheet.title || 'LAPORAN KEGIATAN PENGELOLAAN GEDUNG', 10, 6);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(sheet.subtitle || '', 10, 11);

            // 2. Scaling dengan Safety Margin yang lebih longgar
            const startY = 18;
            const endY = 290; 
            const availableHeight = endY - startY;
            
            const headHeight = 10;
            const bodyRowsCount = sheet.activities.length;
            // Gunakan Math.floor dan kurangi 1mm agar benar-benar aman
            const bodyRowHeight = Math.floor((availableHeight - headHeight) / bodyRowsCount) - 1;

            // 3. Pre-load Images
            const processedImages = new Map();
            for (const activity of sheet.activities) {
                const selectedIndices = state.selectedPhotos[sheet.name]?.[activity.row] || [];
                const folderId = state.mapping[sheet.name];
                const folder = state.folders.find(f => f.id == folderId);
                
                if (folder && selectedIndices.length > 0) {
                    const dataUrls = [];
                    for (const idx of selectedIndices) {
                        const imgData = folder.images[idx];
                        const dataUrl = await blobToDataURL(imgData.data);
                        dataUrls.push(dataUrl);
                    }
                    processedImages.set(activity.row, dataUrls);
                }
            }

            // 4. Table
            const tableRows = sheet.activities.map((act, i) => [
                i + 1,
                act.text,
                act.volume,
                ''
            ]);

            // Paksa kembali ke halaman 1 agar satu grup dengan header merah
            doc.setPage(1);

            doc.autoTable({
                startY: startY,
                head: [['NO', 'AKTIFITAS PEKERJAAN', 'FREKUENSI', 'FOTO PEKERJAAN']],
                body: tableRows,
                theme: 'grid',
                showHead: 'firstPage',
                styles: {
                    fontSize: 7,
                    cellPadding: 0.5,
                    minCellHeight: bodyRowHeight,
                    valign: 'middle',
                    overflow: 'linebreak',
                    lineWidth: 0.1,
                    lineColor: [0, 0, 0]
                },
                headStyles: { 
                    fillColor: telkomRed, 
                    textColor: [255, 255, 255], 
                    fontSize: 8,
                    minCellHeight: headHeight,
                    halign: 'center',
                    valign: 'middle'
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 75 },
                    2: { cellWidth: 25, halign: 'center' },
                    3: { cellWidth: 'auto' }
                },
                didDrawCell: (data) => {
                    if (data.section === 'body' && data.column.index === 3) {
                        const rowIndex = data.row.index;
                        const activity = sheet.activities[rowIndex];
                        
                        if (activity) {
                            const images = processedImages.get(activity.row);
                            if (images && images.length > 0) {
                                const padding = 0.5;
                                const imgCount = Math.min(images.length, 2);
                                const imgWidth = (data.cell.width - (padding * (imgCount + 1))) / imgCount;
                                const imgHeight = data.cell.height - (padding * 2);

                                images.slice(0, 2).forEach((imgUrl, i) => {
                                    const x = data.cell.x + padding + (i * (imgWidth + padding));
                                    const y = data.cell.y + padding;
                                    try {
                                        doc.addImage(imgUrl, 'JPEG', x, y, imgWidth, imgHeight);
                                    } catch (e) {
                                        console.error('PDF Image Error', e);
                                    }
                                });
                            }
                        }
                    }
                },
                margin: { top: 0, bottom: 0, left: 10, right: 10 },
                pageBreak: 'avoid'
            });

            // Simpan setiap sheet sebagai file PDF terpisah
            const cleanSheetName = sheet.name.replace(/[^a-z0-9]/gi, '_');
            doc.save(`Laporan_${cleanSheetName}_${new Date().getTime()}.pdf`);
        }

        goToStep(6);
        showToast(`Berhasil mengekspor ${state.sheets.length} file PDF!`, 'success');
        hideLoading();
    } catch (err) {
        console.error('PDF Generation Error:', err);
        showToast('Gagal membuat PDF: ' + err.message, 'error');
        hideLoading();
    }
};

elements.btnDownloadAgain.onclick = () => {
    elements.btnGenerate.click();
};

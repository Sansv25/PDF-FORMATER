/**
 * EXCEL GENERATION WORKER
 * Menjalankan proses penyusunan Excel di latar belakang agar UI tidak freeze.
 */

// Muat ExcelJS dari CDN (harus menggunakan versi yang kompatibel dengan worker)
importScripts('https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js');

self.onmessage = async function(e) {
    console.log('Worker: Pesan diterima, mulai memproses data...');
    const { sheets, folders, mapping, selectedPhotos, excelFileBuffer } = e.data;
    
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(excelFileBuffer);
        
        for (const sheetState of sheets) {
            console.log(`Worker: === Memproses Sheet: "${sheetState.name}" ===`);
            const worksheet = workbook.getWorksheet(sheetState.name);
            const folderId = mapping[sheetState.name];
            const folder = folders.find(f => f.id == folderId);
            const selectedMap = selectedPhotos[sheetState.name] || {};

            if (!worksheet) {
                console.error(`Worker: Sheet "${sheetState.name}" TIDAK DITEMUKAN di Workbook!`);
                continue;
            }

            // Hapus gambar lama secara agresif
            let removedCount = 0;
            const images = worksheet.getImages(); // Gunakan metode resmi
            
            // Tambahkan pengecekan keamanan agar tidak error "undefined"
            if (images && images.length > 0 && worksheet._images) {
                console.log(`Worker: Ditemukan ${images.length} gambar total di sheet ini.`);
                // Filter internal _images secara aman
                worksheet._images = worksheet._images.filter(img => {
                    const col = img.range.tl.col;
                    const shouldRemove = (col === 2 || col === 3);
                    if (shouldRemove) removedCount++;
                    return !shouldRemove;
                });
            }
            console.log(`Worker: Selesai membersihkan. Terhapus: ${removedCount} gambar.`);

            let processedActivities = 0;
            
            // Perbesar ukuran kolom C dan D agar foto punya ruang
            const colC = worksheet.getColumn(3); // Kolom C (1-based index)
            const colD = worksheet.getColumn(4); // Kolom D
            if (!colC.width || colC.width < 35) colC.width = 35;
            if (!colD.width || colD.width < 35) colD.width = 35;

            for (const activity of sheetState.activities) {
                const selectedIndices = selectedMap[activity.row] || [];
                if (selectedIndices.length === 0) continue;

                processedActivities++;
                const nTotal = selectedIndices.length;
                const nC = Math.ceil(nTotal / 2);
                const nD = nTotal - nC;

                const row = worksheet.getRow(activity.row);
                
                // Sesuaikan tinggi baris berdasarkan jumlah foto yang menumpuk
                // Minimal 120 poin per foto agar terlihat jelas
                const maxPhotosInCol = Math.max(nC, nD);
                row.height = 120 * maxPhotosInCol;

                // Proses Gambar Kolom C (2)
                for (let i = 0; i < nC; i++) {
                    const imgData = folder.images[selectedIndices[i]];
                    const imageId = workbook.addImage({
                        base64: imgData.base64,
                        extension: 'jpeg',
                    });

                    // Gunakan proporsi desimal (lebih aman daripada EMU)
                    // margin 5% agar foto tidak menempel persis di garis cell
                    const partHeight = 1 / nC;
                    worksheet.addImage(imageId, {
                        tl: { col: 2.05, row: (activity.row - 1) + (i * partHeight) + 0.05 },
                        br: { col: 2.95, row: (activity.row - 1) + ((i + 1) * partHeight) - 0.05 },
                        editAs: 'oneCell'
                    });
                }

                // Proses Gambar Kolom D (3)
                for (let i = 0; i < nD; i++) {
                    const imgData = folder.images[selectedIndices[nC + i]];
                    const imageId = workbook.addImage({
                        base64: imgData.base64,
                        extension: 'jpeg',
                    });

                    const partHeight = 1 / nD;
                    worksheet.addImage(imageId, {
                        tl: { col: 3.05, row: (activity.row - 1) + (i * partHeight) + 0.05 },
                        br: { col: 3.95, row: (activity.row - 1) + ((i + 1) * partHeight) - 0.05 },
                        editAs: 'oneCell'
                    });
                }
            }
            console.log(`Worker: Selesai memproses ${processedActivities} aktivitas di sheet "${sheetState.name}".`);
        }

        // Generate final buffer
        const finalBuffer = await workbook.xlsx.writeBuffer();
        
        // Kirim kembali ke main thread
        self.postMessage({ success: true, buffer: finalBuffer }, [finalBuffer.buffer]);
        
    } catch (err) {
        self.postMessage({ success: false, error: err.message });
    }
};

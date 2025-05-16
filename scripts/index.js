// Elemen DOM
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const convertBtn = document.getElementById('convertBtn');
const identifyBtn = document.getElementById('identifyBtn');
const homeBtn = document.getElementById('homeBtn');
const imagePreviewBox = document.getElementById('imagePreviewBox');
const textResultBox = document.getElementById('textResultBox');
const extractedText = document.getElementById('extractedText');
const uploadSection = document.getElementById('uploadSection');
const resultSection = document.getElementById('resultSection');
const resultLabel = document.getElementById('resultLabel');
const progressBar = document.querySelector('.progress-bar');
const progress = document.querySelector('.progress');
const identifiedResultText = document.querySelector('#identifyRslt');

//Format inputan
const validFormatImages = ['png','jpg','jpeg']; 

//NEW! Library menngelola & menyimpan objek crop inputan
let cropper; 

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        if(!validFormatImages.includes(file.type.split('/')[1])){
            return Swal.fire({icon:'error',text:'Format file tidak disupport, mohon coba kembali!',title:'Error!'});
        }
        const reader = new FileReader();
        
        reader.onload = function(event) {
            // Bersihkan konten sebelumnya dan tampilkan gambar
            imagePreviewBox.innerHTML = '';
            const img = document.createElement('img');
            img.src = event.target.result;
            img.style.width = '100%';           //NEW
            img.style.maxHeight = '500px';      //NEW
            img.id = 'croppableImage';          //NEW 
            imagePreviewBox.appendChild(img);

            // NEW! Hancurkan cropper sebelumnya jika error
            if (cropper) {
                 cropper.destroy();
            }

            // NEW! Inisialisasi Cropper.js yang baru diunggah
            cropper = new Cropper(img, {
                viewMode: 1,
                autoCropArea: 0.8,
                zoomable: true,
                movable: true,      //gambar bisa digeser
                scalable: true,
                cropBoxResizable: true,     //ubah ukuran crop secara manual
                cropBoxMovable: true,
            });

            // Tampilkan tombol konversi
            convertBtn.classList.remove('hidden');
        };
        
        reader.readAsDataURL(file);
    }
});

convertBtn.addEventListener('click', function() {
    const img = imagePreviewBox.querySelector('img');
    if (img) {
        // Tampilkan progress bar
        // progress.style.display = 'block';

        Swal.fire({
          title: "Processing...",
          html: "Please wait, converting the image to text!",
          didOpen: () => {
            Swal.showLoading();
          }
        })
        
        // Proses gambar dengan OCR
       const croppedCanvas = cropper.getCroppedCanvas();        //Ambil gambar yg sudah di crop
       Tesseract.recognize(         //NEW! membaca teks dari gambar
       croppedCanvas.toDataURL(),      //NEW! ubah gambar hasil crop ke format digital (Base64/data URL), yang siap diproses
            'ind+eng', // Menggunakan bahasa Indonesia dan Inggris
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progressValue = Math.round(m.progress * 100);
                        progressBar.style.width = `${progressValue}%`;
                    }
                }
            }
        ).then(({ data: { text } }) => {
            // Sembunyikan progress bar
            progress.style.display = 'none';
            
            if(!text)
                return Swal.fire({icon:'error',text:'Tidak ada teks terdeteksi! Mohon coba kembali dengan foto yang berbeda',title:'Error!'});

            text = text.toLowerCase();
            if(text.indexOf('komposisi') === -1 && text.indexOf('composition') === -1){
                return Swal.fire({icon:'error',text:'Teks komposisi tidak terdeteksi! Mohon coba kembali dengan foto yang berbeda',title:'Error!'});
            }

            let startIndex = text.indexOf('komposisi');
            
            if(startIndex === -1){
                startIndex = text.indexOf('composition');
            }

            text = text.slice(startIndex);

            // Tampilkan hasil teks
            textResultBox.classList.remove('hidden');
            extractedText.textContent = text || 'Tidak ada teks terdeteksi.';
            
            // Tampilkan tombol identifikasi
            identifyBtn.classList.remove('hidden');

            Swal.fire({icon:'success',text:'Teks berhasil diekstrak!',title:'Success!'});
        });
    }
});

identifyBtn.addEventListener('click', function() {
    const text = extractedText.textContent;
    
    // Analisis teks untuk klasifikasi
    const result = analyzeSentiment(text);
    
    // Set hasil dan beralih ke bagian hasil
    resultLabel.textContent = result.status;

    identifiedResultText.innerHTML = highlightKeywords(text);

    uploadSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
});

// Fungsi untuk menganalisis teks
function analyzeSentiment(text) {
    const lowerText = text.toLowerCase();
    
    // Cek kata kunci non halal / syubhat
    for (const keyword of nonhalalKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
            return { status: 'Non Halal', class: 'nonhalal' };
        }
    }
    
    // Cek kata kunci syubhat
    for (const keyword of syubhatKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
            return { status: 'Syubhat (Meragukan)', class: 'syubhat' };
        }
    }
    
    // Default ke halal
    return { status: 'Halal', class: 'halal' };
}

// Fungsi untuk menyorot kata kunci yang ditemukan
function highlightKeywords(text) {
    let displayText = text;
    const allKeywords = [...nonhalalKeywords, ...syubhatKeywords];
    
    allKeywords.sort((a, b) => b.length - a.length);
    
    const escapedKeywords = allKeywords.map(keyword => 
        keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim()
    );
    
    const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
    
    return displayText.replace(pattern, '<span class="highlight">$1</span>');
}

homeBtn.addEventListener('click', function() {
    // Reset semua dan kembali ke bagian unggah
    location.reload();
});

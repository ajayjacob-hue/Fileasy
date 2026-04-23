# Fileasy 🚀

**Fileasy** is a beautiful, privacy-first standalone desktop toolkit designed to convert, merge, compress, and secure your documents locally. No cloud uploads, no subscriptions—just effortless file processing.

![Fileasy UI Overview](https://raw.githubusercontent.com/ajayjacob-hue/Fileasy/main/client/public/vite.svg)

## ✨ Features

*   **Smart Compression**: Progressive multi-pass engine that hammers file sizes down to under 4MB while maintaining quality.
*   **Interactive Image to PDF**: Modern grid interface with large previews and drag-and-drop reordering.
*   **High-Fidelity Office Conversion**: Perfect Word (.docx) and PowerPoint (.pptx) to PDF conversion (via local COM automation).
*   **Pro PDF-to-Word**: Convert complex PDFs back to editable Word documents locally.
*   **Security Suite**: AES-encrypted PDF Protection and standard Unlock tools.
*   **Seamless Merge**: Combine multiple PDFs with a custom ordering interface.
*   **Custom Naming**: Take full control of your output filenames with smart defaults.

---

## 💾 Installation (For Users)

If you just want to use Fileasy without touching any code:

1.  Go to the [Releases](https://github.com/ajayjacob-hue/Fileasy/releases) page. (Or find `Fileasy.exe` in the `api/dist` folder if you downloaded the source).
2.  Download `Fileasy.exe`.
3.  **Run it!** 
    *   *Note: Because the app is not digitally signed, Windows SmartScreen may show a warning. Click **"More info"** -> **"Run anyway"**.*
    *   *Requirement: For Word and PPT conversions, ensure you have Microsoft Office installed on your machine.*

---

## 🛠️ Development Setup (For Contributors)

If you want to run the source code or build it yourself:

### Prerequisites
*   **Node.js** (v16+)
*   **Python 3.10+**
*   **Microsoft Office** (Optional, required for Word/PPT tools)

### 1. Setup the Backend (API)
```powershell
cd api
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt # Or manual install of: fastapi uvicorn fitz pikepdf docx2pdf pdf2docx comtypes
python main.py
```

### 2. Setup the Frontend (Client)
```bash
cd client
npm install
npm run dev
```

### 3. Build the Standalone EXE
```powershell
# In the client folder
npm run build
# Copy client/dist to api/static
# In the api folder
.\venv\Scripts\pyinstaller.exe Fileasy.spec --clean
```

---

## 🔒 Privacy & Security
Fileasy is built on a **local-first** philosophy. Your documents never leave your computer. The application spins up a tiny, secure web server on your local machine (`127.0.0.1:8000`) to process files, ensuring your sensitive data remains entirely under your control.

---

## 📄 License
Apache License 2.0 - feel free to use and modify for your own projects!

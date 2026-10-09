const Tesseract = require('tesseract.js');
async function run() {
  try {
    const worker = await Tesseract.createWorker(['eng', 'hin'], 1);
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD,
    });
    console.log("Worker ready");
  } catch(e) {
    console.error("Failed:", e);
  }
}
run();

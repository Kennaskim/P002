const { app, BrowserWindow } = require("electron");
const { exec } = require("child_process");
const path = require("path");

let mainWindow;
let djangoProcess;
let reactProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // Hides the typical browser menu for a cleaner app look
  });

  // Load the React frontend
  mainWindow.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
  console.log("Starting Standalone Django Backend...");

  // Point to the PyInstaller .exe we just made in Step 1
  const backendPath = path.join(__dirname, 'backend', 'dist', 'textbook_backend', 'textbook_backend.exe');
  
  // --noreload is CRITICAL when running Django from a PyInstaller executable
  djangoProcess = exec(`"${backendPath}" runserver --noreload`);

  console.log("Starting React Frontend...");
  const reactCommand = `cd frontend && npm run dev`;
  reactProcess = exec(reactCommand);

  // Wait 8 seconds for both servers to fully boot up, then open the window
  setTimeout(createWindow, 8000);
});

// Clean up background processes when the user closes the app
app.on("window-all-closed", () => {
  if (djangoProcess) exec(`taskkill /pid ${djangoProcess.pid} /t /f`);
  if (reactProcess) exec(`taskkill /pid ${reactProcess.pid} /t /f`);
  if (process.platform !== "darwin") app.quit();
})
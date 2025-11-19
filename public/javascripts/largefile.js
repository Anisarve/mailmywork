// /public/javascripts/largefile.js
(() => {

  // DOM References
  const shareTab = document.getElementById("shareTab");
  const receiveTab = document.getElementById("receiveTab");
  const shareContent = document.getElementById("shareContent");
  const receiveContent = document.getElementById("receiveContent");

  const generateCodeBtn = document.getElementById("generateCodeBtn");
  const generatedCodeBox = document.getElementById("generatedCodeBox");
  const generatedCode = document.getElementById("generatedCode");

  const filePickerDiv = document.createElement("div");
  filePickerDiv.style.marginTop = "1rem";
  filePickerDiv.style.display = "none";
  filePickerDiv.innerHTML = `
    <input type="file" id="fileInputLarge" style="width:100%; padding:0.7rem; background:#0f1824; border:none; color:white;">
  `;
  shareContent.appendChild(filePickerDiv);

  const shareFileBtn = document.getElementById("shareFileBtn");
  const shareProgressArea = document.getElementById("shareProgress");
  const shareProgressBar = document.getElementById("shareProgressBar");
  const shareProgressText = document.getElementById("shareProgressText");

  const connectReceiverBtn = document.getElementById("connectReceiverBtn");
  const receiveCodeInput = document.getElementById("receiveCode");
  const receiveProgressArea = document.getElementById("receiveProgress");
  const receiveProgressBar = document.getElementById("receiveProgressBar");
  const receiveProgressText = document.getElementById("receiveProgressText");
  const downloadFileBtn = document.getElementById("downloadFileBtn");

  // UI Helpers
  function updateProgress(bar, text, value) {
    value = Math.min(100, Math.max(0, Math.round(value)));
    bar.style.width = value + "%";
    text.textContent = value + "%";
  }

  function showAlert(msg) {
    alert(msg);
  }

  // Socket Setup
  if (typeof io === "undefined") return showAlert("Socket.IO missing. Include /socket.io/socket.io.js");
  const socket = io();

  // State variables
  let currentRoomId = null;
  let role = null;
  let peerConnected = false;

  let selectedFile = null;
  let shareAbort = false;

  const CHUNK_SIZE = 64 * 1024;

  let senderSentChunks = {}; // seq → ArrayBuffer
  let senderTotalChunks = 0;

  let receivedChunks = {}; // seq → Uint8Array
  let receiveTotalChunks = null;
  let receiveTotalBytes = 0;
  let receiveReceivedBytes = 0;
  let receiveFilename = "download";

  const resendThrottle = new Set();
  const RESEND_THROTTLE_MS = 200;

  let missingCheckTimer = null;

  // Tabs
  shareTab.onclick = () => {
    shareTab.classList.add("active");
    receiveTab.classList.remove("active");
    shareContent.style.display = "block";
    receiveContent.style.display = "none";
  };
  receiveTab.onclick = () => {
    receiveTab.classList.add("active");
    shareTab.classList.remove("active");
    shareContent.style.display = "none";
    receiveContent.style.display = "block";
  };

  // Generate Code (Sender)
  generateCodeBtn.onclick = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    currentRoomId = code;
    role = "sender";
    peerConnected = false;
    selectedFile = null;

    generatedCode.textContent = code;
    generatedCodeBox.style.display = "block";

    filePickerDiv.style.display = "block";
    shareFileBtn.style.display = "none";
    shareFileBtn.disabled = true;

    updateProgress(shareProgressBar, shareProgressText, 0);

    socket.emit("join-room", { roomId: currentRoomId, role });
  };

  // File selection
  document.addEventListener("change", (e) => {
    if (e.target.id === "fileInputLarge") {
      selectedFile = e.target.files[0] || null;
      if (selectedFile) {
        shareFileBtn.style.display = "block";
        shareFileBtn.disabled = !peerConnected;
      }
    }
  });

  // Room status updates
  socket.on("room-status", (data) => {
    if (data.status === "waiting") {
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Waiting for receiver...";
    }

    if (data.status === "connected") {
      peerConnected = true;
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Receiver Connected!";
      if (selectedFile) shareFileBtn.disabled = false;
    }
  });

  // Sender: send chunks
  shareFileBtn.onclick = async () => {
    if (!peerConnected) return showAlert("Receiver not connected.");
    if (!selectedFile) return showAlert("Select a file first.");

    shareAbort = false;
    shareProgressArea.style.display = "block";

    const total = selectedFile.size;
    senderTotalChunks = Math.ceil(total / CHUNK_SIZE);
    senderSentChunks = {};

    socket.emit("file-meta", {
      roomId: currentRoomId,
      filename: selectedFile.name,
      totalSize: total,
      totalChunks: senderTotalChunks
    });

    let offset = 0;
    let seq = 0;

    while (offset < total) {
      if (shareAbort) return;

      const blob = selectedFile.slice(offset, offset + CHUNK_SIZE);
      const buffer = await blob.arrayBuffer();

      senderSentChunks[seq] = buffer;

      socket.emit("file-chunk", {
        roomId: currentRoomId,
        seq,
        chunk: buffer,
        size: buffer.byteLength,
        totalChunks: senderTotalChunks
      });

      offset += buffer.byteLength;
      seq++;

      updateProgress(shareProgressBar, shareProgressText, (offset / total) * 100);

      await new Promise((r) => setTimeout(r, 2));
    }

    socket.emit("file-complete", {
      roomId: currentRoomId,
      filename: selectedFile.name,
      totalChunks: senderTotalChunks
    });
  };

  // Sender handles resend request
  socket.on("resend-request", ({ seq }) => {
    if (senderSentChunks[seq]) {
      socket.emit("file-chunk", {
        roomId: currentRoomId,
        seq,
        chunk: senderSentChunks[seq],
        size: senderSentChunks[seq].byteLength,
        totalChunks: senderTotalChunks
      });
    }
  });

  // Receiver joining
  connectReceiverBtn.onclick = () => {
    const code = receiveCodeInput.value.trim();
    if (!/^\d{6}$/.test(code)) return showAlert("Invalid code.");

    currentRoomId = code;
    role = "receiver";
    peerConnected = false;

    receiveProgressArea.style.display = "block";
    updateProgress(receiveProgressBar, receiveProgressText, 0);

    socket.emit("join-room", { roomId: currentRoomId, role });
  };

  // Receiver: file-meta
  socket.on("file-meta", ({ filename, totalSize, totalChunks }) => {
    receiveFilename = filename;
    receiveTotalBytes = totalSize;
    receiveTotalChunks = totalChunks;
    receiveReceivedBytes = 0;
    receivedChunks = {};

    if (missingCheckTimer) clearInterval(missingCheckTimer);
    missingCheckTimer = setInterval(checkMissingChunks, 300);
  });

  // Receiver: chunk receive
  socket.on("file-chunk", ({ seq, chunk, size }) => {
    if (receivedChunks[seq]) return;

    const u8 = new Uint8Array(chunk);
    receivedChunks[seq] = u8;
    receiveReceivedBytes += u8.byteLength;

    updateProgress(receiveProgressBar, receiveProgressText, (receiveReceivedBytes / receiveTotalBytes) * 100);
  });

  // Receiver: resend missing chunks
  function checkMissingChunks() {
    if (!receiveTotalChunks) return;

    for (let i = 0; i < receiveTotalChunks; i++) {
      if (!receivedChunks[i]) {
        const key = `${currentRoomId}:${i}`;
        if (resendThrottle.has(key)) continue;

        socket.emit("resend-request", { roomId: currentRoomId, seq: i });
        resendThrottle.add(key);

        setTimeout(() => resendThrottle.delete(key), RESEND_THROTTLE_MS);
        return;
      }
    }
  }

  // Receiver: file-complete → assemble
  socket.on("file-complete", ({ filename }) => {
    receiveFilename = filename;

    const interval = setInterval(() => {
      let missing = false;
      for (let i = 0; i < receiveTotalChunks; i++) {
        if (!receivedChunks[i]) missing = true;
      }
      if (!missing) {
        clearInterval(interval);
        assembleFile();
      }
    }, 300);
  });

  function assembleFile() {
    const parts = [];
    let total = 0;

    for (let i = 0; i < receiveTotalChunks; i++) {
      const chunk = receivedChunks[i];
      parts.push(chunk);
      total += chunk.length;
    }

    const final = new Uint8Array(total);
    let offset = 0;

    parts.forEach((c) => {
      final.set(c, offset);
      offset += c.length;
    });

    const blob = new Blob([final]);
    const url = URL.createObjectURL(blob);

    downloadFileBtn.style.display = "block";
    downloadFileBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = receiveFilename;
      a.click();
    };

    updateProgress(receiveProgressBar, receiveProgressText, 100);
  }

})();

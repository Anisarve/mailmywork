// /public/javascripts/largefile.js
(() => {
  // DOM refs
  const shareTab = document.getElementById("shareTab");
  const receiveTab = document.getElementById("receiveTab");

  const shareContent = document.getElementById("shareContent");
  const receiveContent = document.getElementById("receiveContent");

  const generateCodeBtn = document.getElementById("generateCodeBtn");
  const generatedCodeBox = document.getElementById("generatedCodeBox");
  const generatedCode = document.getElementById("generatedCode");

  const filePickerDiv = document.createElement("div");
  filePickerDiv.style.marginTop = "1rem";
  filePickerDiv.style.width = "100%";
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

  // Helpers
  function updateProgress(barEl, textEl, value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    barEl.style.width = v + "%";
    textEl.textContent = v + "%";
  }

  function showAlert(msg) {
    try { alert(msg); } catch (e) { console.log(msg); }
  }

  // Socket setup
  if (typeof io === "undefined") {
    showAlert("Socket.IO client missing. Include /socket.io/socket.io.js before this file.");
    return;
  }
  const socket = io();

  // State
  let currentRoomId = null;
  let role = null;
  let peerConnected = false;

  // Sender state
  let selectedFile = null;
  let shareAbort = false;
  const CHUNK_SIZE = 64 * 1024; // 64KB recommended
  let senderSentChunks = {}; // seq -> ArrayBuffer
  let senderTotalChunks = 0;

  // Receiver state
  let receivedChunks = {}; // seq -> Uint8Array
  let receiveTotalChunks = null;
  let receiveTotalBytes = 0;
  let receiveReceivedBytes = 0;
  let receiveFilename = "download";
  let missingCheckTimer = null;
  const MISSING_CHECK_INTERVAL = 300; // ms
  const RESEND_THROTTLE_MS = 200; // per-seq throttle
  const resentRecently = new Set();

  // Pairing timer
  const PAIR_TIMEOUT = 120000; // 2 min
  let pairTimer = null;

  // Generate Code (sender)
  generateCodeBtn.onclick = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    currentRoomId = code;
    role = "sender";
    peerConnected = false;
    selectedFile = null;
    senderSentChunks = {};
    senderTotalChunks = 0;

    generatedCode.textContent = code;
    generatedCodeBox.style.display = "block";
    shareProgressArea.style.display = "none";
    filePickerDiv.style.display = "block";

    // hide share button until file is chosen
    shareFileBtn.style.display = "none";
    shareFileBtn.disabled = true;

    updateProgress(shareProgressBar, shareProgressText, 0);

    socket.emit("join-room", { roomId: currentRoomId, role });

    clearTimeout(pairTimer);
    pairTimer = setTimeout(() => {
      if (!peerConnected) {
        socket.emit("send-error", { roomId: currentRoomId, message: "Pairing timeout" });
        showAlert("No receiver connected within time limit. Try again.");
      }
    }, PAIR_TIMEOUT);
  };

  // File selection
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "fileInputLarge") {
      selectedFile = e.target.files[0] || null;
      if (selectedFile) {
        shareFileBtn.style.display = "block";
        shareFileBtn.disabled = !peerConnected;
      } else {
        shareFileBtn.style.display = "none";
        shareFileBtn.disabled = true;
      }
    }
  });

  // Room status from server
  socket.on("room-status", (data) => {
    if (!data) return;
    if (data.status === "waiting" && role === "sender") {
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Waiting for receiver...";
    }
    if (data.status === "connected") {
      peerConnected = true;
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Receiver Connected!";
      if (role === "sender" && selectedFile) shareFileBtn.disabled = false;
    }
  });

  socket.on("error-message", (msg) => {
    showAlert(msg);
  });

  socket.on("disconnect", () => {
    peerConnected = false;
    showAlert("Disconnected from server.");
    shareFileBtn.disabled = true;
  });

  // ------- SENDER -------

  // Handle resend requests from receiver
  socket.on("resend-request", ({ seq }) => {
    if (typeof seq !== "number") return;
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

  // Share file button click — prepare and send chunks with seq
  shareFileBtn.onclick = async () => {
    if (!peerConnected) return showAlert("Receiver not connected yet.");
    if (!selectedFile) return showAlert("Select a file first.");

    shareAbort = false;
    shareProgressArea.style.display = "block";
    updateProgress(shareProgressBar, shareProgressText, 0);

    const total = selectedFile.size;
    senderTotalChunks = Math.ceil(total / CHUNK_SIZE);
    senderSentChunks = {};

    // send meta (include totalChunks)
    socket.emit("file-meta", {
      roomId: currentRoomId,
      filename: selectedFile.name,
      totalSize: total,
      totalChunks: senderTotalChunks
    });

    let offset = 0;
    let seq = 0;

    while (offset < total) {
      if (shareAbort) {
        socket.emit("send-error", { roomId: currentRoomId, message: "Sender aborted transfer" });
        return;
      }

      const blob = selectedFile.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await blob.arrayBuffer();

      // store for possible resend
      senderSentChunks[seq] = arrayBuffer;

      // send chunk with seq and size
      socket.emit("file-chunk", {
        roomId: currentRoomId,
        seq,
        chunk: arrayBuffer,
        size: arrayBuffer.byteLength,
        totalChunks: senderTotalChunks
      });

      offset += arrayBuffer.byteLength;
      seq++;

      updateProgress(shareProgressBar, shareProgressText, (offset / total) * 100);

      // short pause to avoid flooding (keeps ordering stable)
      await new Promise(resolve => setTimeout(resolve, 2));
    }

    // notify completion and include totalChunks
    socket.emit("file-complete", {
      roomId: currentRoomId,
      filename: selectedFile.name,
      totalChunks: senderTotalChunks
    });
  };

  // ------- RECEIVER -------

  socket.on("file-meta", ({ filename, totalSize, totalChunks }) => {
    receiveFilename = filename || "download";
    receiveTotalBytes = typeof totalSize === "number" ? totalSize : 0;
    receiveTotalChunks = typeof totalChunks === "number" ? totalChunks : null;
    receiveReceivedBytes = 0;
    receivedChunks = {};
    receiveProgressArea.style.display = "block";
    updateProgress(receiveProgressBar, receiveProgressText, 0);

    // start missing-check timer
    if (missingCheckTimer) clearInterval(missingCheckTimer);
    missingCheckTimer = setInterval(checkForMissingChunksAndRequest, MISSING_CHECK_INTERVAL);
  });

  // Per-chunk receive
  socket.on("file-chunk", ({ seq, chunk, size, totalChunks }) => {
    // Validate seq
    if (typeof seq !== "number" || !chunk) return;

    // Convert ArrayBuffer/typed array -> Uint8Array
    let u8;
    if (chunk instanceof ArrayBuffer) {
      u8 = new Uint8Array(chunk);
    } else if (chunk && chunk.buffer instanceof ArrayBuffer) {
      u8 = new Uint8Array(chunk.buffer);
    } else {
      console.warn("Unexpected chunk format", chunk);
      return;
    }

    // If already received, ignore duplicate
    if (receivedChunks[seq]) {
      // duplicate, ignore
    } else {
      receivedChunks[seq] = u8;
      receiveReceivedBytes += u8.byteLength;
    }

    // If sender included totalChunks mid-transfer, capture it
    if (!receiveTotalChunks && typeof totalChunks === "number") {
      receiveTotalChunks = totalChunks;
    }

    // Update progress using actual bytes received
    if (receiveTotalBytes > 0) {
      updateProgress(receiveProgressBar, receiveProgressText, (receiveReceivedBytes / receiveTotalBytes) * 100);
    } else if (receiveTotalChunks) {
      // estimate based on chunks if total bytes unknown
      const got = Object.keys(receivedChunks).length;
      updateProgress(receiveProgressBar, receiveProgressText, (got / receiveTotalChunks) * 100);
    }
  });

  // On sender announces completion — wait for missing and assemble
  socket.on("file-complete", ({ filename, totalChunks }) => {
    if (filename) receiveFilename = filename;
    if (typeof totalChunks === "number") receiveTotalChunks = totalChunks;

    // Poll until all chunks received
    const waitInterval = setInterval(() => {
      if (!receiveTotalChunks) return; // still don't know total
      let allPresent = true;
      for (let i = 0; i < receiveTotalChunks; i++) {
        if (!receivedChunks[i]) {
          allPresent = false;
          break;
        }
      }
      if (allPresent) {
        clearInterval(waitInterval);
        if (missingCheckTimer) clearInterval(missingCheckTimer);
        assembleAndProvideDownload(filename || receiveFilename);
      } else {
        // request missing chunks immediately (one pass)
        checkForMissingChunksAndRequest(true);
      }
    }, 300);
  });

  // Missing chunk detector and requester
  function checkForMissingChunksAndRequest(forceImmediate = false) {
    if (!receiveTotalChunks) return;
    for (let i = 0; i < receiveTotalChunks; i++) {
      if (!receivedChunks[i]) {
        const key = `${currentRoomId}:${i}`;
        if (resentRecently.has(key) && !forceImmediate) {
          continue; // recently requested
        }
        // request resend
        socket.emit("resend-request", { roomId: currentRoomId, seq: i });
        // throttle repeat requests
        resentRecently.add(key);
        setTimeout(() => resentRecently.delete(key), RESEND_THROTTLE_MS);
        // only request one missing per interval to reduce spam
        return;
      }
    }
  }

  function assembleAndProvideDownload(filename) {
    // assemble in order
    const parts = [];
    let totalBytes = 0;
    for (let i = 0; i < receiveTotalChunks; i++) {
      const chunk = receivedChunks[i];
      if (!chunk) {
        showAlert("Missing chunk during final assembly. Aborting.");
        return;
      }
      parts.push(chunk);
      totalBytes += chunk.length;
    }
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    parts.forEach((p) => {
      combined.set(p, offset);
      offset += p.length;
    });

    const blob = new Blob([combined]);
    const url = URL.createObjectURL(blob);

    downloadFileBtn.style.display = "block";
    downloadFileBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || receiveFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    // final progress set to 100%
    updateProgress(receiveProgressBar, receiveProgressText, 100);

    // clear state
    receivedChunks = {};
    receiveTotalChunks = null;
    receiveTotalBytes = 0;
    receiveReceivedBytes = 0;
    resentRecently.clear();
  }

  // Handle sender/receiver errors
  socket.on("send-error", ({ message }) => {
    showAlert("Transfer error: " + (message || "unknown"));
    shareAbort = true;
    if (missingCheckTimer) clearInterval(missingCheckTimer);
  });

  // Clean up on disconnect
  window.addEventListener("beforeunload", () => {
    try { socket.emit("leave-room", { roomId: currentRoomId }); } catch (e) {}
  });
})();

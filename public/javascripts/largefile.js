// /public/javascripts/largefile.js
// Assumes socket.io client is available at /socket.io/socket.io.js
// e.g. <script src="/socket.io/socket.io.js"></script> before this file in the page.

(() => {
  // --- DOM refs ---
  const shareTab = document.getElementById("shareTab");
  const receiveTab = document.getElementById("receiveTab");

  const shareContent = document.getElementById("shareContent");
  const receiveContent = document.getElementById("receiveContent");

  const generateCodeBtn = document.getElementById("generateCodeBtn");
  const generatedCodeBox = document.getElementById("generatedCodeBox");
  const generatedCode = document.getElementById("generatedCode");
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

  // --- UI: Tabs ---
  shareTab.addEventListener("click", () => {
    shareTab.classList.add("active");
    receiveTab.classList.remove("active");
    shareContent.style.display = "block";
    receiveContent.style.display = "none";
  });

  receiveTab.addEventListener("click", () => {
    receiveTab.classList.add("active");
    shareTab.classList.remove("active");
    shareContent.style.display = "none";
    receiveContent.style.display = "block";
  });

  // --- helpers ---
  function updateProgress(barEl, textEl, value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    barEl.style.width = v + "%";
    textEl.textContent = v + "%";
  }

  function showAlert(msg) {
    // simple fallback - you can replace with nicer UI
    try { window.alert(msg); } catch (e) { console.log("Alert:", msg); }
  }

  // --- Socket setup ---
  if (typeof io === "undefined") {
    console.error("socket.io client not found. Make sure /socket.io/socket.io.js is included on the page.");
    showAlert("Realtime features unavailable: socket.io client not loaded.");
    // still allow code generation but no network behavior
  }

  const socket = (typeof io !== "undefined") ? io() : { emit: () => {}, on: () => {}, off: () => {} };

  // --- state ---
  let currentRoomId = null;
  let role = null; // "sender" or "receiver"
  let peerConnected = false;
  let shareAbort = false;

  // Timeout for waiting pairing (ms)
  const PAIR_TIMEOUT = 120000; // 2 minutes
  let pairTimer = null;

  // --- Room / pairing flow ---
  generateCodeBtn.addEventListener("click", () => {
    // generate random 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    currentRoomId = code;
    role = "sender";
    generatedCode.textContent = code;
    generatedCodeBox.style.display = "block";
    shareFileBtn.style.display = "none";
    shareProgressArea.style.display = "none";
    updateProgress(shareProgressBar, shareProgressText, 0);

    // Emit join-room
    socket.emit("join-room", { roomId: currentRoomId, role });

    // start pairing timer
    clearTimeout(pairTimer);
    pairTimer = setTimeout(() => {
      if (!peerConnected) {
        socket.emit("send-error", { roomId: currentRoomId, message: "Pairing timeout" });
        showAlert("No receiver connected within time limit. Please try again.");
      }
    }, PAIR_TIMEOUT);
  });

  // Sender: show share file button once connected
  socket.on("room-status", (data) => {
    if (!data || !data.status) return;
    if (data.status === "waiting" && role === "sender") {
      // waiting for receiver
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Waiting for receiver...";
    } else if (data.status === "connected") {
      peerConnected = true;
      clearTimeout(pairTimer);
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Receiver connected. Ready to transfer.";
      if (role === "sender") {
        shareFileBtn.style.display = "block";
      } else if (role === "receiver") {
        receiveProgressArea.style.display = "block";
        generatedCodeBox.style.display = "none";
      }
    }
  });

  socket.on("error-message", (msg) => {
    // show error to user
    console.error("Socket error:", msg);
    showAlert(String(msg));
  });

  socket.on("disconnect", (reason) => {
    console.warn("Socket disconnected:", reason);
    peerConnected = false;
    // notify UI
    if (role === "sender") {
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Disconnected from server.";
    }
    showAlert("Connection lost. Transfer aborted.");
  });

  // --- Sender: select file and send chunks ---
  shareFileBtn.addEventListener("click", () => {
    if (!currentRoomId || role !== "sender") {
      showAlert("Generate a code and connect first.");
      return;
    }
    if (!peerConnected) {
      showAlert("No receiver connected yet.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // reset UI
      shareProgressArea.style.display = "block";
      updateProgress(shareProgressBar, shareProgressText, 0);
      shareAbort = false;

      // chunking params (tweakable)
      const CHUNK_SIZE = 128 * 1024; // 128KB
      const totalSize = file.size;
      let offset = 0;

      try {
        // notify receiver filename & size (optional)
        socket.emit("file-meta", { roomId: currentRoomId, filename: file.name, totalSize });

        while (offset < totalSize) {
          if (shareAbort) throw new Error("Share aborted");

          const chunk = file.slice(offset, offset + CHUNK_SIZE);
          const arrayBuffer = await chunk.arrayBuffer();

          // emit binary chunk, include current offset and total
          socket.emit("file-chunk", {
            roomId: currentRoomId,
            chunk: arrayBuffer, // socket.io will send binary automatically
            current: offset,
            total: totalSize
          });

          offset += arrayBuffer.byteLength;

          const percent = (offset / totalSize) * 100;
          updateProgress(shareProgressBar, shareProgressText, percent);
        }

        // signal completion
        socket.emit("file-complete", { roomId: currentRoomId, filename: file.name });

      } catch (err) {
        console.error("Send error:", err);
        socket.emit("send-error", { roomId: currentRoomId, message: err.message || "Send failed" });
        showAlert("File send failed: " + (err.message || "unknown"));
      }
    };

    input.click();
  });

  // allow remote to notify sender of errors (e.g. receiver lost)
  socket.on("send-error", (payload) => {
    // if sender receives a send-error from server/receiver
    console.error("send-error received:", payload);
    showAlert(payload?.message || "Remote error received.");
    // abort active send if any
    shareAbort = true;
  });

  // --- Receiver: connect using code and accept chunks ---
  connectReceiverBtn.addEventListener("click", () => {
    const code = (receiveCodeInput.value || "").trim();
    if (!/^\d{6}$/.test(code)) {
      showAlert("Enter a valid 6-digit code.");
      return;
    }
    currentRoomId = code;
    role = "receiver";
    peerConnected = false;
    receiveProgressArea.style.display = "block";
    updateProgress(receiveProgressBar, receiveProgressText, 0);
    downloadFileBtn.style.display = "none";

    // join room
    socket.emit("join-room", { roomId: currentRoomId, role });

    // start a short timer to wait for pairing confirmation (optional)
    clearTimeout(pairTimer);
    pairTimer = setTimeout(() => {
      if (!peerConnected) {
        showAlert("No sender accepted the code yet.");
      }
    }, 20000);
  });

  // --- Receiving binary chunks ---
  let receiveBuffers = [];
  let receiveTotalSize = 0;
  let receiveReceivedBytes = 0;
  let receiveFilename = "download";

  socket.on("file-meta", ({ filename, totalSize }) => {
    if (typeof totalSize === "number") receiveTotalSize = totalSize;
    if (filename) receiveFilename = filename;
  });

  socket.on("file-chunk", (data) => {
    // data expected: { chunk: ArrayBuffer|typed array, current, total }
    try {
      const { chunk, current, total } = data;

      // convert chunk to Uint8Array if ArrayBuffer
      let u8;
      if (chunk instanceof ArrayBuffer) {
        u8 = new Uint8Array(chunk);
      } else if (chunk && chunk.buffer instanceof ArrayBuffer) {
        // already a typed array
        u8 = new Uint8Array(chunk.buffer);
      } else {
        // fallback: attempt JSON-parsed base64? Not expected in this setup.
        console.error("Unexpected chunk type", chunk);
        return;
      }

      receiveBuffers.push(u8);
      receiveReceivedBytes += u8.byteLength;
      if (!receiveTotalSize && typeof total === "number") receiveTotalSize = total;

      const percent = receiveTotalSize ? (receiveReceivedBytes / receiveTotalSize) * 100 : 0;
      updateProgress(receiveProgressBar, receiveProgressText, percent);

    } catch (err) {
      console.error("Error receiving chunk:", err);
      socket.emit("send-error", { roomId: currentRoomId, message: "Receiver error processing chunk" });
      showAlert("Error receiving data.");
    }
  });

  socket.on("file-complete", ({ filename }) => {
    // assemble
    try {
      // compute total bytes and concat
      const totalBytes = receiveBuffers.reduce((s, b) => s + b.byteLength, 0);
      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      receiveBuffers.forEach((b) => {
        combined.set(b, offset);
        offset += b.byteLength;
      });

      const blob = new Blob([combined]);
      const url = URL.createObjectURL(blob);
      downloadFileBtn.style.display = "block";
      receiveFilename = filename || receiveFilename;

      downloadFileBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = url;
        a.download = receiveFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // cleanup
        URL.revokeObjectURL(url);
      };

      // reset buffers for next transfer
      receiveBuffers = [];
      receiveReceivedBytes = 0;
      receiveTotalSize = 0;
      updateProgress(receiveProgressBar, receiveProgressText, 100);

    } catch (err) {
      console.error("Error finalizing file:", err);
      socket.emit("send-error", { roomId: currentRoomId, message: "Receiver finalize error" });
      showAlert("Failed to finalize file.");
    }
  });

  // --- Additional error handling / room-full / pairing feedback ---
  socket.on("error-message", (msg) => {
    console.error("Server error-message:", msg);
    showAlert(msg);
  });

  // Clean up when peer disconnects
  socket.on("disconnect", () => {
    peerConnected = false;
    // update UI
    updateProgress(shareProgressBar, shareProgressText, 0);
    updateProgress(receiveProgressBar, receiveProgressText, 0);
    shareFileBtn.style.display = "none";
    downloadFileBtn.style.display = "none";
  });

  // On page unload, try to notify server (best-effort)
  window.addEventListener("beforeunload", () => {
    try {
      if (currentRoomId) socket.emit("leave-room", { roomId: currentRoomId });
    } catch (e) {}
  });

  // Expose some functions for debugging from console
  window.__mailmywork = {
    socket,
    currentRoomId: () => currentRoomId,
    role: () => role,
    resetReceiveBuffers: () => { receiveBuffers = []; receiveReceivedBytes = 0; receiveTotalSize = 0; updateProgress(receiveProgressBar, receiveProgressText, 0); }
  };

})();

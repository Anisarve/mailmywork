// /public/javascripts/largefile.js
(() => {

  // ------------------------------------------------------------
  // Utility
  // ------------------------------------------------------------
  function updateProgress(bar, text, val) {
    val = Math.max(0, Math.min(100, Math.round(val)));
    bar.style.width = val + "%";
    text.textContent = val + "%";
  }

  function alertBox(msg) {
    try { alert(msg); } catch (e) { console.log(msg); }
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }


  // ------------------------------------------------------------
  // DOM References
  // ------------------------------------------------------------
  const shareTab = document.getElementById("shareTab");
  const receiveTab = document.getElementById("receiveTab");
  const shareContent = document.getElementById("shareContent");
  const receiveContent = document.getElementById("receiveContent");

  const generateCodeBtn = document.getElementById("generateCodeBtn");
  const generatedCode = document.getElementById("generatedCode");
  const generatedCodeBox = document.getElementById("generatedCodeBox");

  const filePickerDiv = document.createElement("div");
  filePickerDiv.style.marginTop = "1.5rem";
  filePickerDiv.style.display = "none";
  filePickerDiv.innerHTML = `
    <label for="fileInputLarge" id="fileInputLabel" style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; padding:2.5rem 1rem; background: rgba(15, 24, 36, 0.6); border: 2px dashed rgba(16, 185, 129, 0.5); border-radius: 12px; color: white; cursor: pointer; transition: all 0.3s ease; box-sizing: border-box;">
      <svg style="width:48px;height:48px;fill:#10b981;margin-bottom:15px;filter:drop-shadow(0 0 5px rgba(16,185,129,0.5));" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"></path></svg>
      <span id="fileInputSpan" style="font-family: 'Rajdhani', sans-serif; font-size: 1.2rem; letter-spacing: 1px; color:#cbd5e1; text-align:center;">Click here to select a Large File (1GB+)</span>
    </label>
    <input type="file" id="fileInputLarge" style="display:none;">
  `;
  shareContent.appendChild(filePickerDiv);

  // Hover animations for the label
  setTimeout(() => {
    const lbl = document.getElementById("fileInputLabel");
    if (lbl) {
      lbl.onmouseover = () => { lbl.style.background = "rgba(16, 185, 129, 0.1)"; lbl.style.borderColor = "#10b981"; lbl.style.transform = "scale(1.02)"; };
      lbl.onmouseout = () => { lbl.style.background = "rgba(15, 24, 36, 0.6)"; lbl.style.borderColor = "rgba(16, 185, 129, 0.5)"; lbl.style.transform = "scale(1)"; };
    }
  }, 100);

  const shareBtn = document.getElementById("shareFileBtn");
  const shareProgressArea = document.getElementById("shareProgress");
  const shareBar = document.getElementById("shareProgressBar");
  const shareText = document.getElementById("shareProgressText");

  const connectReceiverBtn = document.getElementById("connectReceiverBtn");
  const receiveCodeInput = document.getElementById("receiveCode");

  const receiveProgressArea = document.getElementById("receiveProgress");
  const recvBar = document.getElementById("receiveProgressBar");
  const recvText = document.getElementById("receiveProgressText");

  const acceptFileBtn = document.getElementById("acceptFileBtn");
  const downloadFileBtn = document.getElementById("downloadFileBtn");


  // ------------------------------------------------------------
  // Tabs
  // ------------------------------------------------------------
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


  // ------------------------------------------------------------
  // Socket.IO (single instance)
  // ------------------------------------------------------------
  if (!window._mainSocket)
    window._mainSocket = io({ transports: ["websocket"], reconnection: true });

  const socket = window._mainSocket;


  // ------------------------------------------------------------
  // Global State
  // ------------------------------------------------------------
  let roomId = null;
  let role = null;
  let peerConnected = false;

  // WebRTC state
  let pc = null;
  let dc = null;
  let rtcFailed = false;

  // Sender / Receiver file state
  let selectedFile = null;

  const RTC_CHUNK = 256 * 1024; // Increased to 256KB for higher throughput
  const RELAY_CHUNK = 256 * 1024;

  // Relay sender
  let relaySenderChunks = {};
  let relaySenderTotal = 0;

  // Relay receiver
  let relayRecvChunks = [];
  let relayExpectedChunks = 0;

  // RTC receiver
  let rtcBuffers = [];
  let rtcExpected = 0;
  let rtcReceived = 0;
  let rtcMeta = null;
  let streamWriter = null;

  // Ready resolver for Sender
  let senderReadyResolver = null;


  // ------------------------------------------------------------
  // GENERATE CODE (Sender)
  // ------------------------------------------------------------
  generateCodeBtn.onclick = () => {
    roomId = Math.floor(100000 + Math.random() * 900000).toString();
    role = "sender";

    generatedCode.textContent = roomId;
    generatedCodeBox.style.display = "block";

    filePickerDiv.style.display = "block";
    shareBtn.style.display = "none";
    shareBtn.disabled = true;

    updateProgress(shareBar, shareText, 0);

    socket.emit("join-room", { roomId });
  };


  // ------------------------------------------------------------
  // RECEIVER JOIN ROOM
  // ------------------------------------------------------------
  connectReceiverBtn.onclick = () => {
    const code = receiveCodeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      return alertBox("Enter a valid 6-digit code.");
    }

    roomId = code;
    role = "receiver";

    receiveProgressArea.style.display = "block";
    updateProgress(recvBar, recvText, 0);

    socket.emit("join-room", { roomId });
  };


  // ------------------------------------------------------------
  // FILE SELECTED
  // ------------------------------------------------------------
  document.addEventListener("change", (e) => {
    if (e.target.id === "fileInputLarge") {
      selectedFile = e.target.files[0] || null;
      const span = document.getElementById("fileInputSpan");
      if (selectedFile) {
        if (span) span.textContent = selectedFile.name;
        shareBtn.style.display = "block";
        shareBtn.disabled = !peerConnected;
      } else {
        if (span) span.textContent = "Click here to select a Large File (1GB+)";
        shareBtn.style.display = "none";
      }
    }
  });


  // ------------------------------------------------------------
  // ROOM STATUS
  // ------------------------------------------------------------
  socket.on("room-status", async (status) => {
    if (status === "waiting") {
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Waiting for receiver...";
      return;
    }

    if (status === "connected") {
      peerConnected = true;
      generatedCodeBox.querySelector("p:nth-child(2)").textContent = "Receiver connected.";

      if (selectedFile) shareBtn.disabled = false;

      // Start WebRTC
      await createWebRTC();
    }
  });


  // ============================================================
  //                  WEBRTC IMPLEMENTATION
  // ============================================================

  async function createWebRTC() {
    rtcFailed = false;

    // Fetch secure TURN credentials from the backend proxy
    let turnServers = [];
    try {
      const res = await fetch("/api/turn");
      turnServers = await res.json();
    } catch (e) { console.error("Failed to fetch TURN credentials", e); }

    const config = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        ...turnServers
      ]
    };

    pc = new RTCPeerConnection(config);

    pc.onicecandidate = (ev) => {
      if (ev.candidate)
        socket.emit("webrtc-ice-candidate", roomId, ev.candidate);
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        rtcFailed = true;
        pc.close();
        switchToRelayFallback();
      }
    };

    pc.ondatachannel = (ev) => {
      dc = ev.channel;
      setupRTCChannel(dc);
    };

    // Sender creates channel
    if (role === "sender") {
      dc = pc.createDataChannel("file");
      setupRTCChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc-offer", roomId, offer);
    }
  }

  socket.on("webrtc-offer", async (offer) => {
    if (!pc) await createWebRTC();

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();

    await pc.setLocalDescription(answer);
    socket.emit("webrtc-answer", roomId, answer);
  });

  socket.on("webrtc-answer", (ans) => {
    if (pc) pc.setRemoteDescription(ans).catch(() => { });
  });

  socket.on("webrtc-ice-candidate", (c) => {
    if (pc) pc.addIceCandidate(c).catch(() => { });
  });


  // ------------------------------------------------------------
  // RTC DataChannel Handlers
  // ------------------------------------------------------------
  function setupRTCChannel(ch) {
    ch.binaryType = "arraybuffer";

    ch.onopen = () => console.log("RTC Channel Open");

    ch.onmessage = async (ev) => {
      const data = ev.data;

      // Receiver gets META
      if (typeof data === "string" && data.startsWith("META::")) {
        const meta = JSON.parse(data.replace("META::", ""));
        rtcExpected = meta.total;
        rtcMeta = meta;
        rtcReceived = 0;
        rtcBuffers = [];

        // Ensure UI is ready, wait for user gesture to save
        acceptFileBtn.textContent = `Accept "${meta.name}" (${(meta.total / (1024 * 1024)).toFixed(2)} MB)`;
        acceptFileBtn.style.display = "block";
        receiveProgressArea.style.display = "none";

        // Define click behavior
        acceptFileBtn.onclick = async () => {
          acceptFileBtn.style.display = "none";
          receiveProgressArea.style.display = "block";

          if (window.showSaveFilePicker) {
            try {
              const handle = await window.showSaveFilePicker({ suggestedName: meta.name });
              streamWriter = await handle.createWritable();
            } catch (err) {
              console.warn("User cancelled or picker failed. Falling back to Memory Blob.", err);
              streamWriter = null;
            }
          } else {
            console.warn("File System Access API not supported. Falling back to Memory Blob.");
            streamWriter = null;
          }

          // Tell sender we are ready
          ch.send("READY");
        };
        return;
      }

      // Sender gets READY
      if (typeof data === "string" && data === "READY") {
        if (senderReadyResolver) senderReadyResolver();
        return;
      }

      // Binary Data Received
      const arr = new Uint8Array(data);
      rtcReceived += arr.length;

      if (streamWriter) {
        // Direct-to-disk
        await streamWriter.write(arr);
      } else {
        // Memory fallback
        rtcBuffers.push(arr);
      }

      updateProgress(recvBar, recvText, (rtcReceived / rtcExpected) * 100);

      // Complete
      if (rtcReceived >= rtcExpected) {
        if (streamWriter) {
          await streamWriter.close();
          streamWriter = null;
          recvText.textContent = "Saved completely!";
        } else {
          assembleRTC(rtcMeta.name);
        }
      }
    };
  }


  // ------------------------------------------------------------
  // RTC SEND FILE
  // ------------------------------------------------------------
  shareBtn.onclick = async () => {
    if (!selectedFile) return alertBox("Select a file first.");
    if (!peerConnected) return alertBox("Receiver not connected.");

    if (!rtcFailed && dc && dc.readyState === "open") {
      shareBtn.disabled = true;
      shareBtn.textContent = "Waiting for receiver to accept...";
      await sendRTC(selectedFile);
      shareBtn.textContent = "File Shared & Completed!";
      window.saveToHistory('share-file', `Transferred Large File: ${selectedFile.name}`, null);
    } else {
      switchToRelayFallback();
      sendRelay(selectedFile);
    }
  };

  async function sendRTC(file) {
    // High water mark / Low water mark backpressure throttling
    dc.bufferedAmountLowThreshold = 16 * 1024 * 1024; // Increased to 16 MB buffer limit for Gigabit throughput

    // Create promise to wait for Receiver's "READY"
    const readyPromise = new Promise(resolve => {
      senderReadyResolver = resolve;
    });

    dc.send(`META::${JSON.stringify({ total: file.size, name: file.name })}`);

    // Await user acceptance
    await readyPromise;
    shareBtn.textContent = "Transferring...";
    shareProgressArea.style.display = "block";

    let offset = 0;
    while (offset < file.size) {
      if (dc.readyState !== "open") break;

      // Throttle if the WebRTC pipe is clogged
      if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
        await new Promise(resolve => {
          dc.onbufferedamountlow = () => {
            dc.onbufferedamountlow = null;
            resolve();
          };
        });
      }

      const chunk = await file.slice(offset, offset + RTC_CHUNK).arrayBuffer();
      dc.send(chunk);

      offset += chunk.byteLength;
      updateProgress(shareBar, shareText, (offset / file.size) * 100);
    }
  }

  function assembleRTC(filename) {
    let total = rtcBuffers.reduce((s, b) => s + b.length, 0);
    let out = new Uint8Array(total);

    let off = 0;
    rtcBuffers.forEach(b => { out.set(b, off); off += b.length; });

    const blob = new Blob([out]);
    promptDownload(blob, filename || "received_file");
  }


  // ============================================================
  //             SOCKET FALLBACK STREAMING MODE
  // ============================================================

  function switchToRelayFallback() {
    rtcFailed = true;
    if (pc) pc.close();
    pc = null;
    dc = null;
  }

  // ---------------- Sender → Relay ------------------
  let relaySenderFile = null;

  function sendRelay(file) {
    relaySenderFile = file;
    const totalChunks = Math.ceil(file.size / RELAY_CHUNK);
    relaySenderTotal = totalChunks;

    socket.emit("fallback-meta", roomId, {
      name: file.name,
      totalChunks
    });

    shareBtn.disabled = true;
    shareBtn.textContent = "Waiting for receiver to accept via Relay...";
  }

  socket.on("fallback-ready", () => {
    if (!relaySenderFile) return;
    shareBtn.textContent = "Transferring via Relay...";
    shareProgressArea.style.display = "block";

    let seq = 0;
    let offset = 0;

    (async function loop() {
      while (offset < relaySenderFile.size) {
        const buf = await relaySenderFile.slice(offset, offset + RELAY_CHUNK).arrayBuffer();
        socket.emit("fallback-chunk", roomId, { seq, chunk: buf });

        offset += buf.byteLength;
        seq++;

        updateProgress(shareBar, shareText, (offset / relaySenderFile.size) * 100);

        // Throttle Socket to avoid overflowing Node buffers for 2GB files
        if (seq % 100 === 0) await sleep(25);
      }
      socket.emit("fallback-complete", roomId, { name: relaySenderFile.name });
      shareBtn.textContent = "Relay File Shared Successfully!";
      window.saveToHistory('share-file', `Transferred Large File (Relay): ${relaySenderFile.name}`, null);
    })();
  });

  // ---------------- Receiver → Relay ------------------
  let relayReceivedCount = 0;

  socket.on("fallback-meta", (meta) => {
    relayExpectedChunks = meta.totalChunks;
    relayMeta = meta;
    relayRecvChunks = new Array(relayExpectedChunks);
    relayReceivedCount = 0;

    const approxSizeMB = (meta.totalChunks * RELAY_CHUNK / (1024 * 1024)).toFixed(2);
    acceptFileBtn.textContent = `Accept "${meta.name}" via Relay (~${approxSizeMB} MB)`;
    acceptFileBtn.style.display = "block";
    receiveProgressArea.style.display = "none";
    updateProgress(recvBar, recvText, 0);

    acceptFileBtn.onclick = async () => {
      acceptFileBtn.style.display = "none";
      receiveProgressArea.style.display = "block";

      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({ suggestedName: meta.name });
          streamWriter = await handle.createWritable();
        } catch (err) { streamWriter = null; }
      }

      socket.emit("fallback-ready", roomId);
    };
  });

  socket.on("fallback-chunk", async ({ seq, chunk }) => {
    if (!relayRecvChunks[seq]) {
      relayReceivedCount++;

      if (streamWriter) {
        relayRecvChunks[seq] = true; // Just mark boolean to save RAM
        await streamWriter.write({ type: "write", position: seq * RELAY_CHUNK, data: chunk });
      } else {
        relayRecvChunks[seq] = new Uint8Array(chunk); // Memory fallback
      }
    }

    updateProgress(recvBar, recvText, (relayReceivedCount / relayExpectedChunks) * 100);
  });

  socket.on("fallback-resend", async (seq) => {
    if (relaySenderFile) {
      const offset = seq * RELAY_CHUNK;
      const buf = await relaySenderFile.slice(offset, offset + RELAY_CHUNK).arrayBuffer();
      socket.emit("fallback-chunk", roomId, { seq, chunk: buf });
    }
  });

  socket.on("fallback-complete", async ({ name }) => {
    // request missing
    let missing = false;
    for (let i = 0; i < relayExpectedChunks; i++) {
      if (!relayRecvChunks[i]) {
        socket.emit("fallback-resend", roomId, i);
        missing = true;
      }
    }
    if (missing) return;

    // assemble or finalize stream
    if (streamWriter) {
      await streamWriter.close();
      streamWriter = null;
      recvText.textContent = "Saved completely!";
    } else {
      const blob = new Blob(relayRecvChunks);
      promptDownload(blob, name);
    }
  });


  // ------------------------------------------------------------
  // Common File Download Utility
  // ------------------------------------------------------------
  function promptDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    downloadFileBtn.style.display = "block";

    downloadFileBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    };

    updateProgress(recvBar, recvText, 100);
  }

})();

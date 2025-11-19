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
    alert(msg);
  }

  // Socket setup
  const socket = typeof io !== "undefined" ? io() : null;
  if (!socket) showAlert("Socket.IO client missing.");

  // State
  let currentRoomId = null;
  let role = null;
  let peerConnected = false;
  let selectedFile = null;
  let shareAbort = false;

  const PAIR_TIMEOUT = 120000;
  let pairTimer = null;

  // Generate Code
  generateCodeBtn.onclick = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    currentRoomId = code;
    role = "sender";
    peerConnected = false;
    selectedFile = null;

    generatedCode.textContent = code;
    generatedCodeBox.style.display = "block";
    shareProgressArea.style.display = "none";

    filePickerDiv.style.display = "block";

    // Hide share button until file selected
    shareFileBtn.style.display = "none";
    shareFileBtn.disabled = true;

    updateProgress(shareProgressBar, shareProgressText, 0);

    socket.emit("join-room", { roomId: currentRoomId, role });

    clearTimeout(pairTimer);
    pairTimer = setTimeout(() => {
      if (!peerConnected) {
        socket.emit("send-error", {
          roomId: currentRoomId,
          message: "Pairing timeout"
        });
        showAlert("No receiver connected. Try again.");
      }
    }, PAIR_TIMEOUT);
  };

  // Enable button once file is selected
  document.addEventListener("change", (e) => {
    if (e.target.id === "fileInputLarge") {
      selectedFile = e.target.files[0];

      if (selectedFile) {
        shareFileBtn.style.display = "block";   // visible now
        shareFileBtn.disabled = !peerConnected; // enable only if receiver connected
      }
    }
  });

  // Room Status
  socket.on("room-status", (data) => {
    if (data.status === "waiting") {
      generatedCodeBox.querySelector("p:nth-child(2)").textContent =
        "Waiting for receiver...";
    }

    if (data.status === "connected") {
      peerConnected = true;
      generatedCodeBox.querySelector("p:nth-child(2)").textContent =
        "Receiver Connected!";

      // Enable share button if file was selected
      if (selectedFile) {
        shareFileBtn.disabled = false;
      }
    }
  });

  // Share File
  shareFileBtn.onclick = async () => {
    if (!peerConnected) return showAlert("Receiver not connected yet.");
    if (!selectedFile) return showAlert("Select a file first.");

    shareAbort = false;
    shareProgressArea.style.display = "block";

    const CHUNK_SIZE = 128 * 1024;
    let offset = 0;
    const total = selectedFile.size;

    socket.emit("file-meta", {
      roomId: currentRoomId,
      filename: selectedFile.name,
      totalSize: total
    });

    while (offset < total) {
      if (shareAbort) return;

      const chunk = selectedFile.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunk.arrayBuffer();

      socket.emit("file-chunk", {
        roomId: currentRoomId,
        chunk: buffer,
        current: offset,
        total
      });

      offset += buffer.byteLength;
      updateProgress(
        shareProgressBar,
        shareProgressText,
        (offset / total) * 100
      );
    }

    socket.emit("file-complete", {
      roomId: currentRoomId,
      filename: selectedFile.name
    });
  };

  // Receiver Connect
  connectReceiverBtn.onclick = () => {
    const code = receiveCodeInput.value.trim();
    if (!/^\d{6}$/.test(code)) return showAlert("Invalid code.");

    currentRoomId = code;
    role = "receiver";

    receiveProgressArea.style.display = "block";
    updateProgress(receiveProgressBar, receiveProgressText, 0);

    socket.emit("join-room", { roomId: currentRoomId, role });
  };

  // Receiving chunks
  let receiveBuffers = [];
  let receiveTotal = 0;
  let receiveName = "";

  socket.on("file-meta", ({ filename, totalSize }) => {
    receiveName = filename;
    receiveTotal = totalSize;
  });

  socket.on("file-chunk", ({ chunk, current, total }) => {
    receiveBuffers.push(new Uint8Array(chunk));
    updateProgress(receiveProgressBar, receiveProgressText, (current / total) * 100);
  });

  socket.on("file-complete", ({ filename }) => {
    const totalBytes = receiveBuffers.reduce((s, a) => s + a.length, 0);
    const all = new Uint8Array(totalBytes);
    let offset = 0;

    receiveBuffers.forEach((arr) => {
      all.set(arr, offset);
      offset += arr.length;
    });

    const blob = new Blob([all]);
    const url = URL.createObjectURL(blob);

    downloadFileBtn.style.display = "block";
    downloadFileBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || receiveName;
      a.click();
    };
  });

})();

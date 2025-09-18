const textBtn = document.getElementById("textBtn");
const fileBtn = document.getElementById("fileBtn");
const contentArea = document.getElementById("contentArea");
const container = document.querySelector(".container");
const uploadList = document.getElementById("uploadList");
const sendBtn = document.getElementById("send-btn");
const email = document.getElementById("email");
const subject = document.getElementById("subject");
let allFiles = [];
const uniqueId = Math.random().toString(36).substring(2, 12);

// Initial container fade-in
gsap.to(container, { opacity: 1, duration: 1, y: 0 });

// Mode switching
textBtn.addEventListener("click", () => setActiveMode("text"));
fileBtn.addEventListener("click", () => setActiveMode("file"));


function setActiveMode(mode) {
  if (mode === "text") {
    textBtn.classList.add("active");
    fileBtn.classList.remove("active");
    allFiles = []; // Clear the file list
    uploadList.innerHTML = ''; // Clear the upload list
    sendBtn.textContent = 'Send to my email';
    animateContent(`<textarea placeholder="Type or paste your text here..." id="textArea"></textarea>`);
  } else {
    fileBtn.classList.add("active");
    textBtn.classList.remove("active");
    sendBtn.textContent = 'Send to my email';
    animateContent(`
      <label class="file-drop" id="dropZone">
        Drop your file here or click to browse
        <input type="file" id="fileInput" onchange='handleFile()' multiple style="display:none;" />
      </label>
    `);
  }
}


// Smooth animation when switching modes
function animateContent(newContent) {
  gsap.to(contentArea, {
    opacity: 0,
    y: 20,
    duration: 0.3,
    onComplete: () => {
      contentArea.innerHTML = newContent;
      gsap.fromTo(contentArea, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3 });

       // If newContent is the file upload mode, init dropzone
      const dropZone = document.getElementById("dropZone");
      const fileInput = document.getElementById("fileInput");

      if (dropZone && fileInput) {
        dropZone.addEventListener("dragover", (e) => {
          e.preventDefault();
          dropZone.classList.add("dragover");
        });

        dropZone.addEventListener("dragleave", () => {
          dropZone.classList.remove("dragover");
        });

        dropZone.addEventListener("drop", (e) => {
          e.preventDefault();
          dropZone.classList.remove("dragover");
          handleFiles(e.dataTransfer.files);
        });
      }


    }
  });
}


function handleFile() {
  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length > 0) {
    for (let i = 0; i < fileInput.files.length; i++) {
      const originalFile = fileInput.files[i];
      const renamedFile = new File([originalFile], uniqueId + originalFile.name, {
        type: originalFile.type,
        lastModified: originalFile.lastModified
      });
      if(uploadFile(renamedFile)){
        allFiles.push(renamedFile.name);
      }
    }
  } else {
    alert("Please select a file to upload.");
  }
}


// Handle and display files
function handleFiles(files) {
  for (let i = 0; i < files.length; i++) {
    const originalFile = files[i];
    const renamedFile = new File([originalFile], uniqueId + originalFile.name, {
      type: originalFile.type,
      lastModified: originalFile.lastModified
    });
    if(uploadFile(renamedFile)){
      allFiles.push(renamedFile.name);
    }
  }
}

function uploadFile(file){
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    alert(`⚠️ "${file.name.substring(10)}" is larger than 10 MB. We are not supporting files above 10 MB for now due to some limitations. We are working on it. Stay happy 😊`);
    return false;
  }
  const formData = new FormData();
  formData.append('files', file);
  let fileDiv = displayFile(file.name); // Display the file in the list
  fetch('/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.status) {
      fileDiv.id = data.fileUrl;
      fileDiv.querySelector(".progress-inner").classList.add('uploaded'); 
      allFiles.push(data.filename);
      return true; // Indicate successful upload
    } else {
      fileDiv.querySelector(".filename").textContent = "File upload failed";
      fileDiv.querySelector(".progress-inner").style.background = 'red';
      console.error('File upload failed:', data.message);
      return false; // Indicate failed upload
    }
  })
  .catch(error => {
    fileDiv.querySelector(".filename").textContent = "Client Error";
    fileDiv.querySelector(".progress-inner").style.background = 'red';
    console.error('Error uploading file:', error);
    return false; // Indicate failed upload
  });
}


function displayFile(filename){
  const fileDiv = document.createElement("div");
  fileDiv.className = "file";
  fileDiv.innerHTML = `
        <div class="file-info">
          <p class="filename">${filename.slice(10)}</p>
          <i class="fa-solid fa-circle-xmark remove-icon" onclick="removeFile(this)"></i>
        </div>
        <div class="progress-outer">
          <div class="progress-inner"></div>
        </div>
  `;
  uploadList.appendChild(fileDiv);
  return fileDiv; // Return the fileDiv for further manipulation if needed
}


// Remove file
function removeFile(element) {
  const fileDiv = element.closest(".file");
  const filename = fileDiv.querySelector(".filename").textContent;
  fetch('/upload/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filename: uniqueId + filename }) // Send the unique ID with the filename
  })
  .then(response => response.json())
  .then(data => {
    if (data.status) {
      allFiles = allFiles.filter(file => file !== uniqueId+filename);
      uploadList.removeChild(fileDiv);
    } else {
      alert('Error removing file: ' + data.message);
      console.error('Error removing file:', data.message);
    }
  }
  ).catch(error => {
    alert('Error removing file: ' + error.message);
    console.error('Error removing file:', error);
  });
}




sendBtn.addEventListener("click", () => {
  if(!email.value.trim() || !email.value.trim().includes("@")) {
    sendBtn.textContent = "Please enter a valid email";
    setTimeout(() => {
      sendBtn.textContent = "Send to My Email";
    }, 2000);
    return;
  }
  if (textBtn.classList.contains("active")) {
    const textArea = document.getElementById("textArea");
    if (!textArea || textArea.value.trim() === "") {
      sendBtn.textContent = "Please enter some text";
      setTimeout(() => {
        sendBtn.textContent = "Send to My Email";
      }, 2000);
      return;
    }
    // Handle sending text content
    sendBtn.style.background = "#0a2966"; // Change button color to indicate sending
    sendBtn.textContent = "Sending...";
    // Send the email with text content
    fetch('/textmail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.value.trim(),
        subject: subject.value.trim(),
        message: textArea.value
      })
    }).then(response => response.json())
    .then(data => {
      if (data.status) {
        sendBtn.textContent = "Text sent successfully!";
        subject.value = '';
        textArea.value = '';
        setTimeout(() => {
          sendBtn.textContent = "Send to My Email";
          sendBtn.style.background = "#1c55d0"; // Reset button color
        }, 2000);
        setTimeout(() => {
          sendBtn.textContent = "Send to My Email";
          sendBtn.style.background = "#1c55d0"; // Reset button color
        }, 2000);
      } else {
        sendBtn.textContent = "Error sending text";
        setTimeout(() => {
          sendBtn.textContent = "Send to My Email";
          sendBtn.style.background = "#1c55d0"; // Reset button color
        }, 2000);
      }
    }).catch(error => {
      console.error('Error:', error);
      sendBtn.textContent = "Error sending text";
      setTimeout(() => {
        sendBtn.textContent = "Send to My Email";
        sendBtn.style.background = "#1c55d0"; // Reset button color
      }, 2000);
    });


  } else if (fileBtn.classList.contains("active")) {
      if (allFiles.length === 0) {
        sendBtn.textContent = "No files to send";
        setTimeout(() => {
          sendBtn.textContent = "Send to My Email";
        }, 2000);
        return;
      }
      // Handle sending files
      sendBtn.style.background = "#0a2966"; // Change button color to indicate sending
      sendBtn.textContent = "Sending...";
      // Send the email with files
      fetch('/upload/finalise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.value.trim(),
          subject: subject.value.trim(),
          files: allFiles
        })
      }).then(response => response.json())
      .then(data => {
        if (data.status) {
          sendBtn.textContent = "Files sent successfully!";
          subject.value = '';
          setTimeout(() => {
          sendBtn.textContent = "Send to My Email";
          sendBtn.style.background = "#1c55d0"; // Reset button color
        }, 2000);
          allFiles = [];
          uploadList.innerHTML = '';
        } else {
          sendBtn.textContent = "Error sending files";
          setTimeout(() => {
            sendBtn.textContent = "Send to My Email";
            sendBtn.style.background = "#1c55d0"; // Reset button color
          }, 2000);
        }
      }).catch(error => {
        console.error('Error:', error);
        sendBtn.textContent = "Error sending files";
        setTimeout(() => {
          sendBtn.textContent = "Send to My Email";
          sendBtn.style.background = "#1c55d0"; // Reset button color
        }, 2000);
      });
  }
})

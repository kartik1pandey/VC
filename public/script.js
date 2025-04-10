const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})

let myVideoStream;
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
let isAudioMuted = false;
let isVideoMuted = false;

// Store added user IDs to prevent duplicates
const addedUsers = new Set();

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream, 'You')
  addedUsers.add('me'); // Mark local user as added

  myPeer.on('call', call => {
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      if (!addedUsers.has(call.peer)) {
        addVideoStream(video, userVideoStream, 'User')
        addedUsers.add(call.peer);
      }
    })
  })

  socket.on('user-connected', userId => {
    if (!addedUsers.has(userId)) {
      connectToNewUser(userId, stream)
    }
  })
}).catch(err => {
  console.error('Error accessing media devices:', err)
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
    delete peers[userId];
    addedUsers.delete(userId);
  }
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    if (!addedUsers.has(userId)) {
      addVideoStream(video, userVideoStream, 'User')
      addedUsers.add(userId);
    }
  })
  call.on('close', () => {
    video.parentElement.remove()
    addedUsers.delete(userId);
  })
  peers[userId] = call
}

function addVideoStream(video, stream, label) {
  const wrapper = document.createElement('div')
  wrapper.className = 'video-wrapper'
  
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  
  const labelElement = document.createElement('div')
  labelElement.className = 'user-label'
  labelElement.textContent = label
  
  wrapper.append(video, labelElement)
  videoGrid.append(wrapper)
}

// Control Buttons
const muteAudioBtn = document.getElementById('mute-audio')
const muteVideoBtn = document.getElementById('mute-video')
const shareLinkBtn = document.getElementById('share-link')

muteAudioBtn.addEventListener('click', () => {
  isAudioMuted = !isAudioMuted
  myVideoStream.getAudioTracks()[0].enabled = !isAudioMuted
  muteAudioBtn.textContent = isAudioMuted ? 'Unmute Audio' : 'Mute Audio'
})

muteVideoBtn.addEventListener('click', () => {
  isVideoMuted = !isVideoMuted
  myVideoStream.getVideoTracks()[0].enabled = !isVideoMuted
  muteVideoBtn.textContent = isVideoMuted ? 'Start Video' : 'Stop Video'
})

shareLinkBtn.addEventListener('click', () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url);

  // Create and style the "Link Copied!" message
  const linkCopied = document.createElement('div');
  linkCopied.className = 'ctr';
  linkCopied.textContent = 'Link Copied!';
  document.body.appendChild(linkCopied);

  // Add fade-out effect after 2 seconds
  setTimeout(() => {
    linkCopied.style.opacity = '0';
    setTimeout(() => {
      linkCopied.remove();
    }, 500); // Wait for fade-out transition to complete
  }, 2000);
});
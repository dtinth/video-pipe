/* global Peer, Vue */

const VideoStream = {
  props: ['videoStream'],
  template: `
    <div>
      <video ref="video"></video>
    </div>
  `,
  mounted() {
    const video = window.video = this.$refs.video
    video.srcObject = this.videoStream
    video.onloadedmetadata = e => {
      console.log(e)
      video.play()
    }
    video.play()
  },
}

const app = new Vue({
  el: '#app',
  components: {
    VideoStream
  },
  data: {
    baseUrl: location.href.replace(/[\?#].*/, ''),
    peerId: '',
    activeConnections: [],
    mode: 'loading',
    error: null,
    videoStreams: [],
    noSleep: false,
    nextStreamId: 1,
    selectedDevice: 'off',
    devices: [],
    callContext: null,
  },
  computed: {
    url() {
      return this.baseUrl + '#' + this.peerId
    },
  },
  watch: {
    noSleep(enabled) {
      /* global NoSleep */
      if (!this.noSleepInstance) this.noSleepInstance = new NoSleep()
      enabled ? this.noSleepInstance.enable() : this.noSleepInstance.disable()
    },
    selectedDevice(deviceId) {
      if (this.callContext) this.callContext.setDeviceId(deviceId)
    }
  },
  mounted() {
    const peer = new Peer(sessionStorage.savedPeerId || undefined)
    window.peer = this.peer = peer
    const registerConnection = (conn) => {
      this.activeConnections.push(conn)
      conn.on('close', () => {
        this.activeConnections.filter(c => c !== conn)
      })
      conn.on('error', () => {
        this.activeConnections.filter(c => c !== conn)
      })
    }
    peer.on('open', async (id) => {
      this.peerId = id
      sessionStorage.savedPeerId = id
      const connectMatch = location.hash.match(/#(\w+)/)
      if (connectMatch) {
        this.mode = 'sender'
        const target = connectMatch[1]
        console.log('Connecting to ', target)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        const devices = await navigator.mediaDevices.enumerateDevices()
        this.devices = Array.from(devices)
          .filter(d => d.kind === 'videoinput')
          .map((d, i) => {
            return {
              deviceId: d.deviceId,
              label: d.label || 'Video input ' + (i + 1)
            }
          })
        let currentCall = {
          dispose() {
            for (const t of stream.getTracks()) t.stop()
          }
        }
        this.callContext = {
          setDeviceId: async deviceId => {
            if (currentCall) currentCall.dispose()
            currentCall = null
            if (deviceId === 'off') {
              return
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId }, audio: false })
            const call = peer.call(target, stream)
            call.on('error', (e) => {
              alert('Cannot establish call!')
            })
            currentCall = {
              dispose() {
                for (const t of stream.getTracks()) t.stop()
                call.close()
              }
            }
          }
        }
      } else {
        this.mode = 'receiver'
      }
    })
    peer.on('call', call => {
      console.log('Call received!')
      const videoStream = { id: this.nextStreamId++, status: 'Waiting for stream', stream: null }
      this.videoStreams.unshift(videoStream)
      call.on('stream', (remoteStream) => {
        videoStream.status = 'Video stream received'
        videoStream.stream = remoteStream
        for (const track of remoteStream.getTracks()) {
          track.addEventListener('ended', () => {
            videoStream.status = 'Track ended'
            this.videoStreams = this.videoStreams.filter(s => s !== videoStream)
          })
        }
      })
      call.on('close', (remoteStream) => {
        videoStream.status = 'Closed'
        this.videoStreams = this.videoStreams.filter(s => s !== videoStream)
      })
      call.answer()
      registerConnection(call)
    })
  },
  methods: {
    async share(e, url) {
      e.preventDefault()
      try {
        await navigator.share({ url })
      } catch (e) {
        prompt('Copy URL', url)
      }
    }
  }
})

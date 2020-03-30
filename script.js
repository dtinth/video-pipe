/* global Peer, Vue */

const VideoStream = {
  props: ['videoStream'],
  template: `
    <div>
      <video ref="video"></video>
    </div>
  `,
  mounted() {
    this.$refs.video.srcObject = this.videoStream
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
    videoStream: null
  },
  computed: {
    url() {
      return this.baseUrl + '#' + this.peerId
    },
  },
  mounted() {
    const peer = new Peer(sessionStorage.savedPeerId || undefined)
    window.peer = this.peer = peer
    const registerConnection = (conn) => {
      this.activeConnections.push(conn)
      conn.on('close', () => {
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
        const call = peer.call(target, stream)
        call.on('error', (e) => {
          alert('Cannot establish call!')
        })
      } else {
        this.mode = 'receiver'
      }
    })
    peer.on('call', call => {
      console.log('Call received!')
      call.on('stream', (remoteStream) => {
        this.videoStream = remoteStream
      })
      call.answer()
    })
  }
})

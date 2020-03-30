/* global Peer, Vue */

const app = new Vue({
  el: '#app',
  data: {
    baseUrl: location.href.replace(/[\?#].*/, ''),
    peerId: '',
    activeConnections: [],
    mode: 'loading',
    error: null,
  },
  computed: {
    url() {
      return this.baseUrl + '#' + this.peerId
    },
  },
  async mounted() {
    const peer = new Peer(sessionStorage.savedPeerId || undefined)
    window.peer = this.peer = peer
    peer.on('open', (id) => {
      this.peerId = id
      sessionStorage.savedPeerId = id
      const connectMatch = location.hash.match(/#(\w+)/)
      if (connectMatch) {
        this.mode = 'receiver'
        const target = connectMatch[1]
        console.log('Connecting to ', target)
        const conn = peer.connect(target)
        conn.on('open', () => {
          console.log('Connected!')
        })
      } else {
        this.mode = 'receiver'
      }
    })
    peer.on('call', conn => {
      console.log('Call received!')
    })
    try {
      const access = this.midiAccess = await navigator.requestMIDIAccess({ sysex: false })
      const refreshPorts = () => {
        this.availableInputs = getKeys(access.inputs).map(key => ({
          key,
          name: access.inputs.get(key).name
        }))
        this.availableOutputs = getKeys(access.outputs).map(key => ({
          key,
          name: access.outputs.get(key).name
        }))
      }
      access.onstatechange = refreshPorts
      refreshPorts()
    } catch (e) {
      this.error = ('Failed to request MIDI access! ' + e)
    }
  }
})

function getKeys(portMap) {
  const keys = []
  const iterator = portMap.keys()
  for (;;) {
    const { done, value: key } = iterator.next()
    if (done) break
    keys.push(key)
  }
  return keys
}
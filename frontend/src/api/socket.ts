import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket(token: string) {
  const url = (import.meta as any).env.VITE_SOCKET_URL as string | undefined
  const apiUrl = (import.meta as any).env.VITE_API_BASE_URL as string
  const base = url || apiUrl || ''
  socket = io(base, {
    // Let Socket.IO choose best transport (polling -> websocket upgrade)
    auth: { token },
  })
  // Debug: log connection lifecycle and errors
  try {
    socket.on('connect', () => {
      console.log('[socket] connected', { id: socket?.id, base })
    })
    socket.on('connect_error', (err: any) => {
      console.error('[socket] connect_error', err?.message || err)
    })
    socket.on('error', (err: any) => {
      console.error('[socket] error', err)
    })
    socket.on('reconnect_error', (err: any) => {
      console.error('[socket] reconnect_error', err?.message || err)
    })
    socket.on('socket:ready', (payload: any) => {
      console.log('[socket] ready', payload)
    })
  } catch {}
  return socket
}

export function disconnectSocket() {
  try { socket?.disconnect() } catch {}
  socket = null
}

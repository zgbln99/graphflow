import Imap from 'imap'
import { simpleParser, ParsedMail } from 'mailparser'

export interface ImapConfig {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
  mailbox: string
}

export function createImapClient(config: ImapConfig): Imap {
  return new Imap({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    tls: config.tls,
    tlsOptions: { rejectUnauthorized: false },
  })
}

export function openMailbox(imap: Imap, mailbox: string): Promise<Imap.Box> {
  return new Promise((resolve, reject) => {
    imap.openBox(mailbox, false, (err, box) => {
      if (err) reject(err)
      else resolve(box)
    })
  })
}

export function searchUnseen(imap: Imap): Promise<number[]> {
  return new Promise((resolve, reject) => {
    imap.search(['UNSEEN'], (err, results) => {
      if (err) reject(err)
      else resolve(results || [])
    })
  })
}

export function fetchMessage(imap: Imap, uid: number): Promise<ParsedMail> {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch([uid], { bodies: '', markSeen: true })

    fetch.on('message', (msg) => {
      let buffer = ''

      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8')
        })
      })

      msg.once('end', async () => {
        try {
          const parsed = await simpleParser(buffer)
          resolve(parsed)
        } catch (err) {
          reject(err)
        }
      })
    })

    fetch.once('error', reject)
  })
}

export function connectAndReady(imap: Imap): Promise<void> {
  return new Promise((resolve, reject) => {
    imap.once('ready', resolve)
    imap.once('error', reject)
    imap.connect()
  })
}

export function disconnectImap(imap: Imap): void {
  try {
    imap.end()
  } catch (e) {
    // Ignore disconnection errors
  }
}

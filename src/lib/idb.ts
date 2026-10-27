/** 最小限の IndexedDB key-value ストア */
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open('kakeibo', 1)
  req.onupgradeneeded = () => req.result.createObjectStore('kv')
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const r = db.transaction('kv').objectStore('kv').get(key)
    r.onsuccess = () => resolve(r.result as T | undefined)
    r.onerror = () => reject(r.error)
  })
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite')
    tx.objectStore('kv').put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

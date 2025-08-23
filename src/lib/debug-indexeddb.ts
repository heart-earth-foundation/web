// Debug utility to check IndexedDB contents
export async function debugIndexedDB() {
  console.log('=== IndexedDB Debug ===')
  
  try {
    // Open the HeartEarthWallet database
    const request = indexedDB.open('HeartEarthWallet', 1)
    
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        console.log('Database does not exist - would need to create it')
      }
    })

    console.log('Database found:', db.name, 'version:', db.version)
    console.log('Object stores:', Array.from(db.objectStoreNames))

    // Check the wallets object store
    const transaction = db.transaction(['wallets'], 'readonly')
    const store = transaction.objectStore('wallets')
    
    // Get all keys
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
    
    console.log('Keys in wallets store:', keys)

    // Get all data
    const data = await new Promise<any[]>((resolve, reject) => {
      const request = store.getAll()
      request.onerror = () => reject(request.error) 
      request.onsuccess = () => resolve(request.result)
    })
    
    console.log('Data in wallets store:', data)

    // Try to get the 'main' record specifically
    const mainRecord = await new Promise<any>((resolve, reject) => {
      const request = store.get('main')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })

    console.log('Main wallet record:', mainRecord)

    db.close()
    
  } catch (error) {
    console.error('IndexedDB Debug Error:', error)
  }
}

// Also check what databases exist
export async function listAllDatabases() {
  try {
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases()
      console.log('All IndexedDB databases:', databases)
    } else {
      console.log('indexedDB.databases() not supported in this browser')
    }
  } catch (error) {
    console.error('Error listing databases:', error)
  }
}
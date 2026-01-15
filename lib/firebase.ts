import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, collection, getDocs, query, where, addDoc, setDoc, doc, getDoc } from "firebase/firestore"
import type { SchemaTemplate, SchemaInstance } from "@/types/excel"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function initApp() {
  try {
    if (!getApps().length) return initializeApp(firebaseConfig)
    return getApp()
  } catch (err) {
    console.error('Firebase init error', err)
    throw err
  }
}

const app = initApp()
const db = getFirestore(app)

export async function getTemplates(): Promise<any[]> {
  try {
    const col = collection(db, 'apps/mapping/schema')
    const snap = await getDocs(col)
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
  } catch (err) {
    console.error('getTemplates error', err)
    return []
  }
}

export async function saveTemplate(name: string, mappings: any): Promise<{ id: string } | null> {
  try {
    const col = collection(db, 'apps/mapping/schema')
    const q = query(col, where('name', '==', name))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const docRef = snap.docs[0].ref
      await setDoc(docRef, { name, mappings }, { merge: true })
      return { id: docRef.id }
    }
    const ref = await addDoc(col, { name, mappings })
    return { id: ref.id }
  } catch (err) {
    console.error('saveTemplate error', err)
    throw err
  }
}

/**
 * Guarda un SchemaTemplate en la colección "schemaTemplates" usando schemaId como id del documento
 */
export async function saveSchemaTemplate(template: SchemaTemplate): Promise<void> {
  try {
    const docRef = doc(db, 'schemaTemplates', template.schemaId)
    await setDoc(docRef, {
      name: template.name,
      type: template.type,
      version: template.version,
      isSystem: true,
      schemaId: template.schemaId,
      description: template.description,
      headerFields: template.headerFields,
      table: template.table,
    }, { merge: true })
  } catch (err) {
    console.error('saveSchemaTemplate error', err)
    throw err
  }
}

/**
 * Guarda una instancia de mapeo en la colección "mappings"
 */
export async function saveMapping(mapping: SchemaInstance & { name: string }): Promise<{ id: string }> {
  try {
    const col = collection(db, 'mappings')
    const ref = await addDoc(col, {
      name: mapping.name,
      schemaId: mapping.schemaId,
      schemaVersion: mapping.schemaVersion,
      headerMappings: mapping.headerMappings,
      tableMappings: mapping.tableMappings,
      createdAt: mapping.createdAt,
    })
    return { id: ref.id }
  } catch (err) {
    console.error('saveMapping error', err)
    throw err
  }
}

/**
 * Obtiene todos los mappings guardados de la colección "mappings"
 */
export async function getMappings(): Promise<(SchemaInstance & { id: string; name: string })[]> {
  try {
    const col = collection(db, 'mappings')
    const snap = await getDocs(col)
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name,
        schemaId: data.schemaId,
        schemaVersion: data.schemaVersion,
        fileName: data.fileName || '',
        headerMappings: data.headerMappings || [],
        tableMappings: data.tableMappings || [],
        createdAt: data.createdAt?.toDate() || new Date(),
      } as SchemaInstance & { id: string; name: string }
    })
  } catch (err) {
    console.error('getMappings error', err)
    return []
  }
}

/**
 * Obtiene un SchemaTemplate por su schemaId
 */
export async function getSchemaTemplate(schemaId: string): Promise<SchemaTemplate | null> {
  try {
    const docRef = doc(db, 'schemaTemplates', schemaId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        schemaId: data.schemaId,
        name: data.name,
        description: data.description,
        version: data.version,
        type: data.type,
        headerFields: data.headerFields || [],
        table: data.table || { columns: [] },
      } as SchemaTemplate
    }
    return null
  } catch (err) {
    console.error('getSchemaTemplate error', err)
    return null
  }
}

/**
 * Obtiene todos los SchemaTemplates disponibles
 */
export async function getSchemaTemplates(): Promise<SchemaTemplate[]> {
  try {
    const col = collection(db, 'schemaTemplates')
    const snap = await getDocs(col)
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        schemaId: data.schemaId,
        name: data.name,
        description: data.description,
        version: data.version,
        type: data.type,
        headerFields: data.headerFields || [],
        table: data.table || { columns: [] },
      } as SchemaTemplate
    })
  } catch (err) {
    console.error('getSchemaTemplates error', err)
    return []
  }
}

export default db

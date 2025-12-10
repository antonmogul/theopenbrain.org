import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useModules() {
  const modules = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchModules = async (versionId = null, status = null) => {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('modules')
        .select(`
          *,
          content_versions (*),
          sections (
            *,
            paragraphs (*)
          )
        `)
        .order('order_index', { ascending: true })

      if (status) {
        query = query.eq('status', status)
      }

      if (versionId) {
        query = query.eq('content_version_id', versionId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      modules.value = data || []
      return { data: modules.value, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const fetchModule = async (moduleId) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('modules')
        .select(`
          *,
          content_versions (*),
          sections (
            *,
            paragraphs (*)
          )
        `)
        .eq('id', moduleId)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createModule = async (moduleData) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: createError } = await supabase
        .from('modules')
        .insert(moduleData)
        .select()
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateModule = async (moduleId, updates) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', moduleId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  return {
    modules,
    loading,
    error,
    fetchModules,
    fetchModule,
    createModule,
    updateModule
  }
}


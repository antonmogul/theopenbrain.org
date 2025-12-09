import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export function useProfile() {
  const { user } = useAuth()
  const profile = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchProfile = async (userId = null) => {
    loading.value = true
    error.value = null
    
    const targetUserId = userId || user.value?.id
    if (!targetUserId) {
      error.value = 'No user ID provided'
      loading.value = false
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (fetchError) throw fetchError

      profile.value = data
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const createProfile = async (profileData) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.value?.id,
          email: user.value?.email,
          ...profileData
        })
        .select()
        .single()

      if (createError) throw createError

      profile.value = data
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  const updateProfile = async (updates) => {
    loading.value = true
    error.value = null

    if (!user.value?.id) {
      error.value = 'No user ID'
      loading.value = false
      return { data: null, error: new Error('No user ID') }
    }

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (updateError) throw updateError

      profile.value = data
      return { data, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  // Auto-fetch profile when user changes
  if (user.value) {
    fetchProfile()
  }

  return {
    profile,
    loading,
    error,
    fetchProfile,
    createProfile,
    updateProfile
  }
}


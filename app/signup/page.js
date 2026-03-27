'use client'
import { useState } from 'react'
import { createClient } from '../lib/supabase'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('Submitting...')
    
    const supabase = createClient()
    console.log('attempting signup with:', email)
    
    const { data, error } = await supabase.auth.signUp({ email, password })
    
    console.log('data:', data)
    console.log('error:', error)
    
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Success! Check your email.')
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Sign Up Test</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ padding: '8px', width: '300px', display: 'block' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ padding: '8px', width: '300px', display: 'block' }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 20px' }}>
          Sign Up
        </button>
      </form>
      <p style={{ marginTop: '20px', color: message.includes('Error') ? 'red' : 'green' }}>
        {message}
      </p>
    </div>
  )
}
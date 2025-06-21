'use client'

import { useState } from 'react'
import { useAuth } from './providers/AuthProvider'
import { toast } from 'react-hot-toast'
import { Scale, Shield, Users, ArrowRight, Eye, EyeOff } from 'lucide-react'

export function AuthInterface() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  })
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let success = false
      if (isLogin) {
        success = await login(formData.email, formData.password)
      } else {
        success = await register(formData.email, formData.password, formData.username)
      }

      if (success) {
        toast.success(isLogin ? 'Successfully logged in!' : 'Account created successfully!')
      } else {
        toast.error(isLogin ? 'Invalid credentials' : 'Registration failed')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-legal-50 via-primary-50 to-accent-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary-600 p-3 rounded-full mr-4">
                <Scale className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-legal-900">Azerbaijani Legal Assistant</h1>
            </div>
            <p className="text-xl text-legal-600 max-w-2xl mx-auto">
              Get reliable legal advice in Azerbaijani language with AI-powered assistance
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Features */}
            <div className="space-y-8">
              <h2 className="text-3xl font-semibold text-legal-900 mb-6">
                Your AI-Powered Legal Companion
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-100 p-2 rounded-lg">
                    <Shield className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-legal-900 mb-2">Trusted Legal Sources</h3>
                    <p className="text-legal-600">Access verified legal documents and official sources</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-accent-100 p-2 rounded-lg">
                    <Users className="h-6 w-6 text-accent-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-legal-900 mb-2">Azerbaijani Language Support</h3>
                    <p className="text-legal-600">Get legal advice in your native language</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-legal-100 p-2 rounded-lg">
                    <ArrowRight className="h-6 w-6 text-legal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-legal-900 mb-2">Instant Responses</h3>
                    <p className="text-legal-600">Quick answers to your legal questions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Form */}
            <div className="card max-w-md mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-legal-900 mb-2">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-legal-600">
                  {isLogin ? 'Sign in to continue' : 'Join us to get started'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-legal-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-legal-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-legal-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="input-field pr-10"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-legal-400 hover:text-legal-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-legal-600">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
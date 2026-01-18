#!/usr/bin/env node
/**
 * Quick diagnostic script to check video generation setup
 * Run: node scripts/test-video-setup.js
 */

// Load .env file
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
} catch (err) {
  // dotenv might not be installed, try without it
  console.warn('⚠️  dotenv not found, trying to read .env manually...')
  try {
    const fs = require('fs')
    const path = require('path')
    const envPath = path.join(__dirname, '..', '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '')
            process.env[key.trim()] = value.trim()
          }
        }
      })
    }
  } catch (e) {
    console.warn('Could not load .env file:', e.message)
  }
}

// For video generation, we only need the API key
const videoRequiredEnvVars = [
  'GOOGLE_GENAI_API_KEY',
  'GOOGLE_VEO_API_KEY',
]

const appRequiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const optionalEnvVars = [
  'MOCK_MODE',
  'VIDEO_GENERATION_ENABLED',
]

console.log('\n' + '='.repeat(60))
console.log('Video Generation Setup Diagnostic')
console.log('='.repeat(60) + '\n')

// Check required env vars
console.log('📋 Environment Variables:')
let videoGood = true
let appGood = true

console.log('\n🎬 Video Generation Variables:')
videoRequiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    const masked = varName.includes('KEY') 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
      : value
    console.log(`  ✅ ${varName}: ${masked}`)
  } else {
    console.log(`  ❌ ${varName}: NOT SET`)
  }
})

console.log('\n📦 App Variables:')
appRequiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    const masked = varName.includes('KEY') 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
      : value
    console.log(`  ✅ ${varName}: ${masked}`)
  } else {
    console.log(`  ❌ ${varName}: NOT SET`)
    appGood = false
  }
})

optionalEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value !== undefined) {
    console.log(`  ℹ️  ${varName}: ${value}`)
  }
})

console.log('\n📊 Configuration Status:')
const mockMode = process.env.MOCK_MODE === 'true'
const videoEnabled = process.env.VIDEO_GENERATION_ENABLED !== 'false'
const hasApiKey = !!(process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_VEO_API_KEY)

console.log(`  MOCK_MODE: ${mockMode ? '✅ Enabled' : '❌ Disabled'}`)
console.log(`  VIDEO_GENERATION_ENABLED: ${videoEnabled ? '✅ Enabled' : '❌ Disabled'}`)
console.log(`  API Key: ${hasApiKey ? '✅ Found' : '❌ Missing'}`)

const videoWillWork = !mockMode && videoEnabled && hasApiKey
console.log(`\n🎬 Video Generation: ${videoWillWork ? '✅ WILL WORK' : '❌ WILL NOT WORK'}`)

if (!videoWillWork) {
  console.log('\n⚠️  Issues to fix:')
  if (mockMode) console.log('  - Set MOCK_MODE=false or remove it')
  if (!videoEnabled) console.log('  - Set VIDEO_GENERATION_ENABLED=true or remove it')
  if (!hasApiKey) console.log('  - Set GOOGLE_GENAI_API_KEY or GOOGLE_VEO_API_KEY')
}

console.log('\n' + '='.repeat(60))
if (videoWillWork) {
  console.log('✅ Video Generation Setup: READY')
  if (!appGood) {
    console.log('⚠️  App Setup: Some variables missing (but video generation will work)')
  } else {
    console.log('✅ Full Setup: READY')
  }
} else {
  console.log('❌ Video Generation Setup: NEEDS ATTENTION')
}
console.log('='.repeat(60) + '\n')

process.exit(videoWillWork ? 0 : 1)

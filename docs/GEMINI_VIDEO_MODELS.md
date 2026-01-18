# Gemini Video Generation Models

## Available Models

### Veo 2
- **Released**: April 2025
- **Duration**: 8 seconds
- **Resolution**: 720p
- **Aspect Ratio**: 16:9
- **Format**: MP4
- **Features**: Text-to-video generation
- **Availability**: Gemini Advanced / Google One AI Premium subscribers

### Veo 3
- **Released**: After Veo 2
- **Duration**: 8 seconds
- **Resolution**: 720p (sometimes higher in certain tiers)
- **Aspect Ratio**: 16:9
- **Format**: MP4
- **Features**: 
  - Text-to-video generation
  - **Synchronized audio** (ambient sounds, dialogue, effects)
  - **Photo-to-video** capability (upload image + describe motion → video)
- **Availability**: Pro or Ultra tier users

### Veo 3.1
- **Released**: Latest version
- **Duration**: 8 seconds
- **Resolution**: 720p (sometimes higher in certain tiers)
- **Aspect Ratio**: 16:9
- **Format**: MP4
- **Features**:
  - All Veo 3 features
  - **"Ingredients to Video"** - Better control over style, referencing objects/characters/textures
- **Availability**: Pro or Ultra tier users

## Subscription Requirements

- **Free tier**: Very limited access (if any), watermarks required
- **Pro/Ultra tier**: Full access to video generation features
- **Watermarks**: Required for free users (if available at all)

## API Integration

### Current Implementation Status
- **File**: `lib/video/generator.ts`
- **Status**: **NOT IMPLEMENTED** (Veo API integration is placeholder)
- **Line**: `const VEO_API_AVAILABLE = false`

### To Implement Veo API

1. **Get API Access**:
   - Need Gemini Pro or Ultra subscription
   - Obtain API key from Google AI Studio or Vertex AI

2. **API Endpoint** (example):
   ```typescript
   const response = await fetch(
     'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1:generateVideo',
     {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${VEO_API_KEY}`,
       },
       body: JSON.stringify({
         prompt: veoPrompt,
         aspectRatio: '16:9',
         duration: 5, // seconds
       }),
     }
   )
   ```

3. **Update Code**:
   - Uncomment `VEO_API_AVAILABLE` calculation in `lib/video/generator.ts`
   - Implement `generateVeoClip()` function (currently throws error)
   - Add `GOOGLE_VEO_API_KEY` to environment variables

## Limits & Constraints

- **Video Length**: 8 seconds maximum
- **Resolution**: 720p standard (may vary by tier)
- **Format**: MP4 only
- **Rate Limits**: Subject to subscription tier
- **Geographic Restrictions**: May not be available in all countries

## Resources

- Google AI Studio: https://aistudio.google.com/
- Gemini API Docs: https://ai.google.dev/
- Veo Overview: https://gemini.google/re/overview/video-generation/

## Current Workaround

Until Veo API is implemented, the system:
- Creates placeholder video URLs (`https://example.com/videos/${id}.mp4`)
- Works in MOCK_MODE
- Sets `video_generation_status = 'completed'` with placeholder

This allows the UI/UX to work while waiting for actual video generation implementation.

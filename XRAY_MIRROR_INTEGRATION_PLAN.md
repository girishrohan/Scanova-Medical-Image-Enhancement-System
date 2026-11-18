# X-Ray Mirror Integration Plan
## SCOVANA Medical Image Enhancement System

### Overview
Integrating a real-time browser-based X-Ray Mirror using MediaPipe for live face/hand landmark tracking and Three.js for 3D anatomical rendering. This will be added as a dedicated "X-Ray Mirror" navigation section in the SCOVANA application.

### Technical Stack
- **MediaPipe Tasks Vision** - for face and hand landmark detection (running locally in browser)
- **Three.js** - for 3D anatomical model rendering
- **HTML5 Webcam API** - for camera access
- **SCOVANA Design System** - colors, typography, spacing constants from `config.py`
- **Streamlit** - for page integration (existing framework)

### Architecture

#### 1. X-Ray Mirror Page (`pages/xray_mirror.py`)
- Standalone Streamlit page
- Camera permission handling
- MediaPipe tracking canvas
- Three.js anatomy renderer
- Split-screen toggle (normal camera / X-ray mode)
- Layer selection controls
- Medical disclaimer

#### 2. Key Components

##### A. Camera & Permission Module
```python
# Handles camera access with proper permission requests
# Supports front/rear camera switching (where supported)
# Cleanup on page unload
```

##### B. MediaPipe Tracking Module
- Face landmarks: 468 points
- Hand landmarks: 21 points each
- Real-time tracking at ~30fps
- Coordinate conversion from MediaPipe to Three.js

##### C. Three.js Anatomy Renderer
- Pre-loaded 3D models (glTF format):
  - Skull
  - Brain (transparent)
  - Facial muscles
  - Eyes
  - Hand bone structure
- X-ray transparency effects
- Real-time alignment with webcam feed
- Smooth transitions between states

##### D. UI Controls
- Front/Rear camera toggle
- Split-screen comparison mode
- Anatomical layer selection
- Opacity/transparency slider
- Tracking status indicator

### Integration Points

#### 1. Navigation Addition
Add "X-Ray Mirror" to the dashboard quick actions and sidebar, following the existing pattern in `pages/dashboard.py`.

#### 2. Design System Integration
- Use existing color palette from `config.py` (navy, teal, blue)
- Consistent typography and spacing
- Match card styles and border radii
- Use existing disclaimer format

#### 3. Session State Management
- Camera state tracking
- Tracking mode (normal/x-ray/split)
- Selected anatomical layer
- Model loading status

#### 4. Resource Management
- Camera stream cleanup on page leave
- Three.js model disposal
- Event listener cleanup

### Safety Requirements

#### 1. Medical Disclaimer
Display prominently:
> **⚠️ Important Safety Notice**: This is an educational anatomical visualization feature, NOT a diagnostic tool. Do not claim that webcam tracking can detect fractures, swelling, diseases or internal abnormalities. Results are for demonstration purposes only.

#### 2. BodyParts3D Attribution
Preserve CC BY-SA 2.1 Japan attribution for any BodyParts3D assets used.

#### 3. No Diagnostic Claims
- Explicitly state: "Webcam tracking cannot detect medical conditions"
- Display disclaimer on every page load
- Never use for clinical decision-making

### Performance Optimization

#### 1. Tracking FPS Target
- Aim for 20-30fps tracking
- Throttle renders if needed
- Use requestAnimationFrame for Three.js renders

#### 2. Model Loading
- Pre-load anatomy models on page initialization
- Use glTF for efficient loading
- Implement lazy loading for secondary models

#### 3. Memory Management
- Dispose of Three.js geometries when unloading
- Release MediaPipe resources on page exit
- Limit canvas size to viewport dimensions

### Deployment Requirements

#### 1. HTTPS Support
- All camera access requires HTTPS or localhost
- Configure Streamlit to serve over HTTPS for production

#### 2. Browser Compatibility
- Chrome, Edge, Firefox (WebGPU support preferred)
- Mobile browsers with camera access
- Fallback for browsers without WebGL2

#### 3. Permission Handling
- Graceful denial handling
- UI states for "camera not available"
- Local storage for permission preferences

### Implementation Phases

#### Phase 1: Foundation
- [ ] Create `pages/xray_mirror.py` page structure
- [ ] Implement camera permission handling
- [ ] Set up MediaPipe Tasks Vision integration
- [ ] Basic Three.js renderer with webcam feed

#### Phase 2: Anatomy Rendering
- [ ] Load 3D anatomy models (skull, brain, facial muscles)
- [ ] Implement x-ray transparency effects
- [ ] Real-time alignment with webcam landmarks
- [ ] Front/rear camera switching

#### Phase 3: UI/UX Enhancements
- [ ] Split-screen comparison mode
- [ ] Anatomical layer selection controls
- [ ] Floating anatomy controls panel
- [ ] Smooth animations and transitions
- [ ] Live tracking status indicator

#### Phase 4: Integration & Testing
- [ ] Add to dashboard navigation
- [ ] Integrate with design system styling
- [ ] Test across browsers and devices
- [ ] Performance profiling and optimization
- [ ] Safety disclaimer verification
- [ ] Deploy and validate

### Dependencies to Add
```python
# Additional Python packages (can be loaded via CDN for Three.js):
# - mediapipe (via pip or CDN)
# - Three.js (via CDN)
# - glTF loader for Three.js

# Or install:
# pip install mediapipe
```

### Testing Checklist
- [ ] Camera permission granted and denied scenarios
- [ ] Tracking works with various lighting conditions
- [ ] 3D models render correctly aligned
- [ ] X-ray toggle switches smoothly
- [ ] Split-screen comparison works
- [ ] Mobile responsiveness
- [ ] Performance remains smooth (20+ fps)
- [ ] Disclaimer displayed correctly
- [ ] Resources cleaned up on page leave
- [ ] HTTPS deployment works

### Known Constraints
- MediaPipe Tasks Vision runs locally in browser - no server upload
- Three.js models must respect licensing (BodyParts3D CC BY-SA 2.1 Japan)
- Camera access requires user permission
- Performance varies by device capability
- Mobile browsers may have reduced camera API support
# 3D Avatar Face Tracking

Real-time face tracking application that maps your facial movements to a 3D avatar using MediaPipe and Three.js.

## Features

- Real-time face detection and tracking (468 landmarks)
- Head rotation tracking (pitch, yaw, roll)
- Facial expressions (eye blinks, mouth opening)
- Debug mode to visualize face landmarks
- Full orbit controls to rotate around avatar
- Subtle breathing animation
- Smooth animations with optimized performance

## Tech Stack

- **Face Detection**: MediaPipe Tasks Vision
- **3D Rendering**: Three.js
- **Avatar**: Ready Player Me
- **Build Tool**: Vite

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

## Camera Permissions

The app requires camera access. Make sure to:
- Use HTTPS in production (required for camera access)
- Allow camera permissions when prompted
- Use a modern browser (Chrome, Firefox, Safari, Edge)

## Controls

- **Debug Mode**: Toggle checkbox to see face landmarks
- **Mouse Drag**: Rotate around avatar
- **Mouse Wheel**: Zoom in/out
- **Camera**: Shows live feed in bottom-right corner

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

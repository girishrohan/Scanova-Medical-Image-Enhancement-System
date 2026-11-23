# 3D Anatomical Models for X-Ray Mirror AR

Place simplified `.glb` (glTF Binary) anatomical mesh files in this directory.
The X-Ray Mirror page loads them via `GLTFLoader` from Three.js.

## Expected Files

| File | Description | Source |
|------|-------------|--------|
| `skull.glb` | Human skull mesh | BodyParts3D (CC BY-SA 2.1 Japan) |
| `brain.glb` | Brain mesh | BodyParts3D (CC BY-SA 2.1 Japan) |
| `facial.glb` | Facial muscles mesh | BodyParts3D (CC BY-SA 2.1 Japan) |
| `eyes.glb` | Eyes mesh | BodyParts3D (CC BY-SA 2.1 Japan) |
| `hands.glb` | Hand bones mesh | BodyParts3D (CC BY-SA 2.1 Japan) |

## Fallback Behavior

If a `.glb` file is not found, the component automatically generates a
procedural anatomical mesh (sphere/torus/cylinder-based) so the AR feature
still works without any model files.

## How to Obtain Models

1. Visit https://lifesciencedb.jp/bp3d/ (BodyParts3D)
2. Download the anatomical parts you need (OBJ format)
3. Convert OBJ → GLB using Blender or an online converter
4. Place the resulting `.glb` files in this directory
5. Restart the dev server

## Licensing

BodyParts3D is licensed under CC BY-SA 2.1 Japan.
Attribution: "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan"

## Notes

- Keep mesh polygon counts low (< 50k triangles) for real-time performance
- Center meshes at origin (0,0,0) and scale to ~1 unit
- The X-Ray shader is applied automatically to all meshes in the model
# Chat History - Website Development

## 3D Scene Adjustments
- Initial adjustments to the bust model in the 3D scene
  - Set to 80% of viewport height
  - Later reduced to 70% for better visual margins
  - Changes committed to `Website/scripts/main.js`

- Further refinements requested and implemented:
  - Centered the bust
  - Addressed title truncation and sphere overlap issues
  - Multiple position adjustments for better alignment
  - Fine-tuned left/right positioning for optimal composition

## Champagne Bottle Integration
- Added bottle of champagne to replace one of the orbital spheres
- Checked model availability in `assets/models/bottle/Pbr`
- Found `base_basic_pbr.glb` (6,358,940 bytes)
- Implemented orientation fixes using `THREE.Group`
- Applied transformations:
  - Scaling
  - Positioning
  - 180-degree rotation around Y-axis
- Successfully animated the bottle in the scene

## Favicon Implementation
1. Initial Setup
   - Backed up existing favicon to `favicon.png.bak`
   - Verified HTML configuration: `<link rel="icon" href="favicon.png" type="image/png">`

2. Creation Process
   - Created `create-favicon.js` script
   - Updated script to use ES modules
   - Successfully generated new star-shaped orange favicon
   - Confirmed file creation (4,416 bytes)

3. Version Control
   - Committed changes to Git repository
   - Added both `favicon.png` and `create-favicon.js`
   - Commit message: "feat: Update favicon to orange star shape"

4. Troubleshooting
   - Investigated favicon not working
   - Verified file integrity:
     - Confirmed PNG format
     - 200x200 pixels
     - 8-bit/color RGBA
   - Suggested solutions:
     - Clear browser cache
     - Add ICO format
     - Implement multiple favicon sizes 
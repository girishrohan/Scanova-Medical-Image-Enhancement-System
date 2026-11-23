"""Append chest/heart/lungs generators to generate_models.py"""
import re

content = open('scripts/generate_models.py').read()

marker = 'if __name__ == "__main__":'
idx = content.index(marker)

new_gens = r'''
def generate_chest():
    """Generate a ribcage / thoracic cage mesh."""
    vertices = []
    normals = []
    indices = []

    u_steps, v_steps = 32, 24
    for j in range(v_steps + 1):
        v = j / v_steps
        for i in range(u_steps + 1):
            u = i / u_steps
            theta = (u - 0.5) * np.pi * 1.2
            phi = v * np.pi

            r = 0.35 + 0.05 * np.sin(phi)
            x = r * np.sin(theta)
            y = 0.3 - v * 0.7
            z = r * np.cos(theta) * 0.6 + 0.1

            if abs(theta) < 0.3:
                z -= 0.05

            vertices.append([x, y, z])
            nx = np.sin(theta)
            ny = -0.3
            nz = np.cos(theta) * 0.6
            ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
            normals.append([nx/ln, ny/ln, nz/ln])

    for j in range(v_steps):
        for i in range(u_steps):
            a = j * (u_steps + 1) + i
            b = a + 1
            c = a + (u_steps + 1)
            d = c + 1
            indices.extend([a, b, c, b, d, c])

    max_idx = len(vertices) - 1
    indices = [min(idx, max_idx) for idx in indices]
    write_glb(os.path.join(OUTPUT_DIR, "chest.glb"), vertices, normals, indices)
    return len(vertices)


def generate_heart():
    """Generate a heart mesh (simplified but anatomically shaped)."""
    vertices = []
    normals = []
    indices = []

    u_steps, v_steps = 40, 32
    for j in range(v_steps + 1):
        v = j / v_steps
        phi = v * np.pi
        for i in range(u_steps + 1):
            u_val = i / u_steps
            theta = u_val * 2 * np.pi

            r = 0.12
            x = r * np.sin(phi) * np.cos(theta)
            y = r * np.cos(phi) * 1.1
            z = r * np.sin(phi) * np.sin(theta)

            if x < 0:
                x *= 1.15
                y -= 0.02

            if y < -0.05:
                taper = 1.0 - 0.4 * min(1.0, (-y - 0.05) / 0.1)
                x *= taper
                z *= taper

            if y > 0.08:
                x *= 0.8
                z *= 0.8

            vertices.append([x, y + 0.05, z + 0.05])
            nx, ny, nz = x, y, z
            ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
            normals.append([nx/ln, ny/ln, nz/ln])

    for j in range(v_steps):
        for i in range(u_steps):
            a = j * (u_steps + 1) + i
            b = a + 1
            c = a + (u_steps + 1)
            d = c + 1
            indices.extend([a, b, c, b, d, c])

    max_idx = len(vertices) - 1
    indices = [min(idx, max_idx) for idx in indices]
    write_glb(os.path.join(OUTPUT_DIR, "heart.glb"), vertices, normals, indices)
    return len(vertices)


def generate_lungs():
    """Generate left and right lung meshes."""
    vertices = []
    normals = []
    indices = []

    for side in [-1, 1]:
        base_idx = len(vertices)
        u_steps, v_steps = 32, 28
        for j in range(v_steps + 1):
            v = j / v_steps
            phi = v * np.pi
            for i in range(u_steps + 1):
                u_val = i / u_steps
                theta = u_val * 2 * np.pi

                r_x = 0.12
                r_y = 0.2
                r_z = 0.1

                x = side * (r_x * np.sin(phi) * np.cos(theta) + 0.05)
                y = r_y * np.cos(phi)
                z = r_z * np.sin(phi) * np.sin(theta)

                if side * x < 0.05:
                    x *= 0.6

                if y < -0.1:
                    taper = 1.0 - 0.5 * min(1.0, (-y - 0.1) / 0.1)
                    x *= taper
                    z *= taper

                vertices.append([x, y, z + 0.05])
                nx = (x - side * 0.05) / r_x
                ny = y / r_y
                nz = z / r_z
                ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
                normals.append([nx/ln, ny/ln, nz/ln])

        for j in range(v_steps):
            for i in range(u_steps):
                a = base_idx + j * (u_steps + 1) + i
                b = a + 1
                c = a + (u_steps + 1)
                d = c + 1
                indices.extend([a, b, c, b, d, c])

    max_idx = len(vertices) - 1
    indices = [min(idx, max_idx) for idx in indices]
    write_glb(os.path.join(OUTPUT_DIR, "lungs.glb"), vertices, normals, indices)
    return len(vertices)

'''

content = content[:idx] + new_gens + content[idx:]

# Update main block
old_main = '''    total += generate_skull()
    total += generate_brain()
    total += generate_eyes()
    total += generate_facial()
    total += generate_hands()'''
new_main = '''    total += generate_skull()
    total += generate_brain()
    total += generate_eyes()
    total += generate_facial()
    total += generate_hands()
    total += generate_chest()
    total += generate_heart()
    total += generate_lungs()'''
content = content.replace(old_main, new_main)

# Update LAYER_DEFS reference in the page? No, that's TS. Just update the script.
open('scripts/generate_models.py', 'w').write(content)
print("Done - updated generate_models.py")
'''

exec(open('scripts/add_models.py').read().split('exec(open')[0])
# Actually just run the file manipulation part
EOF
python -c "
content = open('scripts/generate_models.py').read()
marker = 'if __name__ == \"__main__\":'
idx = content.index(marker)
# Read the new generators from a temp file
new_gens = open('/dev/stdin').read() if False else None
print('checking')
"
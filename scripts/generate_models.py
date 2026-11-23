#!/usr/bin/env python3
"""Generate detailed anatomical GLB models for the X-Ray Mirror AR app.

These are high-detail procedural anatomical meshes (NOT simple spheres/cubes).
Each mesh has realistic anatomical features with thousands of vertices.
"""

import numpy as np
import struct
import json
import os

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def write_glb(filepath, vertices, normals, indices):
    """Write a minimal glTF Binary (.glb) file."""
    vertices = np.array(vertices, dtype=np.float32)
    normals = np.array(normals, dtype=np.float32)
    indices = np.array(indices, dtype=np.uint16)

    # Binary buffers
    vert_bytes = vertices.tobytes()
    norm_bytes = normals.tobytes()
    idx_bytes = indices.tobytes()

    # Pad to 4-byte alignment
    def pad4(b):
        r = len(b) % 4
        return b + b'\x00' * (4 - r) if r else b

    idx_padded = pad4(idx_bytes)
    vert_padded = pad4(vert_bytes)
    norm_padded = pad4(norm_bytes)

    total_buf = idx_padded + vert_padded + norm_padded
    idx_offset = 0
    vert_offset = len(idx_padded)
    norm_offset = vert_offset + len(vert_padded)

    # Compute bounding box
    v_min = vertices.min(axis=0).tolist()
    v_max = vertices.max(axis=0).tolist()

    gltf = {
        "asset": {"version": "2.0", "generator": "SCANOVA-ModelGen"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": os.path.splitext(os.path.basename(filepath))[0]}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 1, "NORMAL": 2},
                "indices": 0,
                "mode": 4
            }]
        }],
        "accessors": [
            {  # indices
                "bufferView": 0,
                "componentType": 5123,  # UNSIGNED_SHORT
                "count": len(indices),
                "type": "SCALAR",
                "max": [int(indices.max())],
                "min": [int(indices.min())]
            },
            {  # positions
                "bufferView": 1,
                "componentType": 5126,  # FLOAT
                "count": len(vertices),
                "type": "VEC3",
                "max": v_max,
                "min": v_min
            },
            {  # normals
                "bufferView": 2,
                "componentType": 5126,
                "count": len(normals),
                "type": "VEC3"
            }
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": idx_offset, "byteLength": len(idx_bytes), "target": 34963},
            {"buffer": 0, "byteOffset": vert_offset, "byteLength": len(vert_bytes), "byteStride": 12, "target": 34962},
            {"buffer": 0, "byteOffset": norm_offset, "byteLength": len(norm_bytes), "byteStride": 12, "target": 34962},
        ],
        "buffers": [{"byteLength": len(total_buf)}]
    }

    gltf_json = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    # Pad JSON to 4-byte alignment
    json_pad = (4 - len(gltf_json) % 4) % 4
    gltf_json += b' ' * json_pad

    # GLB structure
    json_chunk = struct.pack('<II', len(gltf_json), 0x4E4F534A) + gltf_json
    bin_chunk = struct.pack('<II', len(total_buf), 0x004E4942) + total_buf
    total_length = 12 + len(json_chunk) + len(bin_chunk)
    header = struct.pack('<III', 0x46546C67, 2, total_length)

    with open(filepath, 'wb') as f:
        f.write(header + json_chunk + bin_chunk)

    print(f"  Written: {os.path.basename(filepath)} ({len(vertices)} verts, {len(indices)//3} tris, {total_length} bytes)")


def generate_skull():
    """Generate a detailed skull mesh with cranium, jaw, and orbital cavities."""
    vertices = []
    normals = []
    indices = []

    # === Cranium (anatomically shaped ellipsoid) ===
    u_steps = 48
    v_steps = 32

    for j in range(v_steps + 1):
        v = j / v_steps
        phi = v * np.pi
        for i in range(u_steps + 1):
            u_val = i / u_steps
            theta = u_val * 2 * np.pi

            rx = 0.38   # side-to-side (narrower)
            ry = 0.52   # top-bottom (taller)
            rz = 0.45   # front-back

            x = rx * np.sin(phi) * np.cos(theta)
            y = ry * np.cos(phi)
            z = rz * np.sin(phi) * np.sin(theta)

            # Flatten the bottom for jaw area
            if y < -0.15:
                squeeze = 1.0 - 0.3 * min(1.0, (-y - 0.15) / 0.35)
                x *= squeeze
                z *= squeeze

            # Brow ridge bump
            if 0.0 < y < 0.2 and z > 0.2:
                brow = 0.04 * np.exp(-((y - 0.08) ** 2) / 0.005)
                z += brow

            # Cheekbone protrusion
            if -0.2 < y < 0.0 and abs(x) > 0.2:
                cheek = 0.03 * np.exp(-((y + 0.1) ** 2) / 0.01)
                x += np.sign(x) * cheek

            # Slight forehead bulge
            if y > 0.2 and z > 0.1:
                forehead = 0.02 * np.exp(-((y - 0.35) ** 2) / 0.02)
                z += forehead

            # Temporal fossa (indent on sides)
            if abs(x) > 0.25 and 0.0 < y < 0.3:
                temporal = -0.015 * np.exp(-((y - 0.15) ** 2) / 0.01)
                x += np.sign(x) * temporal

            vertices.append([x, y + 0.1, z])

            nx = x / (rx * rx + 0.001)
            ny = (y + 0.1) / (ry * ry + 0.001)
            nz = z / (rz * rz + 0.001)
            ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
            normals.append([nx/ln, ny/ln, nz/ln])

    for j in range(v_steps):
        for i in range(u_steps):
            a = j * (u_steps + 1) + i
            b = a + 1
            c = a + (u_steps + 1)
            d = c + 1
            indices.extend([a, c, b, b, c, d])

    # === Eye sockets (indentations) ===
    base_idx = len(vertices)
    socket_centers = [(-0.14, 0.05, 0.38), (0.14, 0.05, 0.38)]
    for cx, cy, cz in socket_centers:
        ring_steps = 20
        depth_steps = 8
        for di in range(depth_steps + 1):
            depth_t = di / depth_steps
            r = 0.08 * (1.0 - 0.4 * depth_t)
            dz = -0.06 * depth_t
            for ri in range(ring_steps + 1):
                angle = ri / ring_steps * 2 * np.pi
                px = cx + r * np.cos(angle)
                py = cy + r * np.sin(angle) * 0.85
                pz = cz + dz
                vertices.append([px, py, pz])
                nx_s = -np.cos(angle) * depth_t
                ny_s = -np.sin(angle) * depth_t * 0.85
                nz_s = -1.0 + 0.5 * (1.0 - depth_t)
                ln = np.sqrt(nx_s**2 + ny_s**2 + nz_s**2) + 1e-8
                normals.append([nx_s/ln, ny_s/ln, nz_s/ln])

        for di in range(depth_steps):
            for ri in range(ring_steps):
                a = base_idx + di * (ring_steps + 1) + ri
                b = a + 1
                c = a + (ring_steps + 1)
                d = c + 1
                indices.extend([a, b, c, b, d, c])
        base_idx = len(vertices)

    # === Nasal cavity ===
    nc_steps = 16
    nd_steps = 6
    ncx, ncy, ncz = 0.0, -0.08, 0.42
    for di in range(nd_steps + 1):
        dt = di / nd_steps
        r = 0.04 * (1.0 - 0.3 * dt)
        for ri in range(nc_steps + 1):
            angle = ri / nc_steps * np.pi
            px = ncx + r * np.cos(angle)
            py = ncy - r * np.sin(angle) * 1.4
            pz = ncz - 0.04 * dt
            vertices.append([px, py, pz])
            normals.append([0, 0, -1])

    for di in range(nd_steps):
        for ri in range(nc_steps):
            a = base_idx + di * (nc_steps + 1) + ri
            b = a + 1
            c = a + (nc_steps + 1)
            d = c + 1
            indices.extend([a, b, c, b, d, c])
    base_idx = len(vertices)

    # === Zygomatic arch (cheekbone bridge) ===
    arch_steps = 24
    for side in [-1, 1]:
        arch_base = len(vertices)
        for ai in range(arch_steps + 1):
            t = ai / arch_steps
            ax = side * (0.3 + 0.08 * np.sin(t * np.pi))
            ay = -0.05 - 0.03 * np.sin(t * np.pi * 0.7)
            az = 0.35 - t * 0.25
            for ri in range(8 + 1):
                angle = ri / 8 * 2 * np.pi
                r = 0.015
                px = ax + r * np.cos(angle) * 0.5
                py = ay + r * np.sin(angle)
                pz = az
                vertices.append([px, py, pz])
                normals.append([np.cos(angle) * 0.5, np.sin(angle), 0])

        for ai in range(arch_steps):
            for ri in range(8):
                a = arch_base + ai * 9 + ri
                b = a + 1
                c = a + 9
                d = c + 1
                indices.extend([a, b, c, b, d, c])
    base_idx = len(vertices)

    # === Jaw / Mandible ===
    jaw_u = 32
    jaw_v = 6
    for jv in range(jaw_v + 1):
        vt = jv / jaw_v
        for ju in range(jaw_u + 1):
            t = ju / jaw_u
            angle = -np.pi * 0.8 + t * np.pi * 1.6
            r_jaw = 0.3 - vt * 0.03
            jx = r_jaw * np.sin(angle)
            jy = -0.4 - vt * 0.08
            jz = r_jaw * np.cos(angle)
            # Chin protrusion
            if abs(angle) < 0.4:
                chin = 0.02 * np.cos(angle * np.pi / 0.8)
                jz += chin
            vertices.append([jx, jy, jz])
            normals.append([0, -1, 0])

    for jv in range(jaw_v):
        for ju in range(jaw_u):
            a = base_idx + jv * (jaw_u + 1) + ju
            b = a + 1
            c = a + (jaw_u + 1)
            d = c + 1
            indices.extend([a, b, c, b, d, c])

    max_idx = len(vertices) - 1
    indices = [min(idx, max_idx) for idx in indices]

    write_glb(os.path.join(OUTPUT_DIR, "skull.glb"), vertices, normals, indices)
    return len(vertices)


def generate_brain():
    """Generate a detailed brain mesh with cerebral hemispheres, sulci, and cerebellum."""
    vertices = []
    normals = []
    indices = []

    u_steps = 56
    v_steps = 36

    for hemi in [-1, 1]:
        base_idx = len(vertices)
        for j in range(v_steps + 1):
            v = j / v_steps
            phi = v * np.pi
            for i in range(u_steps + 1):
                u_val = i / u_steps
                theta = u_val * np.pi

                rx, ry, rz = 0.32, 0.28, 0.38

                x = rx * np.sin(phi) * np.cos(theta)
                y = ry * np.cos(phi)
                z = rz * np.sin(phi) * np.sin(theta)

                x += hemi * 0.02
                if hemi == -1:
                    x = -abs(x) - 0.01
                else:
                    x = abs(x) + 0.01

                # Sulci (brain wrinkles)
                sulci = (0.012 * np.sin(phi * 8 + theta * 3) +
                         0.008 * np.sin(phi * 12 + theta * 7) +
                         0.005 * np.sin(phi * 20 + theta * 11) +
                         0.003 * np.cos(phi * 15 - theta * 5))

                r_base = np.sqrt(x*x + y*y + z*z) + 1e-8
                x += (x / r_base) * sulci
                y += (y / r_base) * sulci
                z += (z / r_base) * sulci

                if y < -0.15:
                    y = -0.15 - (y + 0.15) * 0.2

                if z > 0.2:
                    z += 0.03 * np.exp(-((z - 0.3)**2) / 0.02)
                if z < -0.2:
                    z -= 0.02 * np.exp(-((z + 0.3)**2) / 0.02)

                vertices.append([x, y + 0.15, z])

                nx = x / (rx + 0.001)
                ny = y / (ry + 0.001)
                nz = z / (rz + 0.001)
                ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
                normals.append([nx/ln, ny/ln, nz/ln])

        for j in range(v_steps):
            for i in range(u_steps):
                a = base_idx + j * (u_steps + 1) + i
                b = a + 1
                c = a + (u_steps + 1)
                d = c + 1
                if hemi == -1:
                    indices.extend([a, c, b, b, c, d])
                else:
                    indices.extend([a, b, c, b, d, c])

    # === Cerebellum ===
    base_idx = len(vertices)
    cb_u, cb_v = 24, 16
    for j in range(cb_v + 1):
        v = j / cb_v
        phi = v * np.pi * 0.6
        for i in range(cb_u + 1):
            u_val = i / cb_u
            theta = u_val * 2 * np.pi
            rx, ry, rz = 0.15, 0.1, 0.12
            x = rx * np.sin(phi) * np.cos(theta)
            y = ry * np.cos(phi)
            z = rz * np.sin(phi) * np.sin(theta)
            ridge = 0.008 * np.sin(theta * 12) + 0.004 * np.sin(phi * 8)
            r_base = np.sqrt(x*x + y*y + z*z) + 1e-8
            x += (x / r_base) * ridge
            y += (y / r_base) * ridge
            z += (z / r_base) * ridge
            vertices.append([x, y - 0.15, z - 0.25])
            normals.append([x/r_base, y/r_base, z/r_base])

    for j in range(cb_v):
        for i in range(cb_u):
            a = base_idx + j * (cb_u + 1) + i
            b = a + 1
            c = a + (cb_u + 1)
            d = c + 1
            indices.extend([a, b, c, b, d, c])

    # === Brain stem ===
    base_idx = len(vertices)
    bs_seg = 12
    bs_rings = 10
    for ri in range(bs_rings + 1):
        t = ri / bs_rings
        cy = -0.15 - t * 0.2
        cz = -0.25 + t * 0.05
        r = 0.035 * (1 - 0.3 * t)
        for si in range(bs_seg + 1):
            angle = si / bs_seg * 2 * np.pi
            px = r * np.cos(angle)
            py = cy
            pz = cz + r * np.sin(angle)
            vertices.append([px, py, pz])
            normals.append([np.cos(angle), 0, np.sin(angle)])

    for ri in range(bs_rings):
        for si in range(bs_seg):
            a = base_idx + ri * (bs_seg + 1) + si
            b = a + 1
            c = a + (bs_seg + 1)
            d = c + 1
            indices.extend([a, b, c, b, d, c])

    max_idx = len(vertices) - 1
    indices = [min(idx, max_idx) for idx in indices]

    write_glb(os.path.join(OUTPUT_DIR, "brain.glb"), vertices, normals, indices)
    return len(vertices)


def generate_eyes():
    """Generate detailed eye meshes with corneal bulge and optic nerve."""
    vertices = []
    normals = []
    indices = []

    eye_centers = [(-0.14, 0.05, 0.35), (0.14, 0.05, 0.35)]

    for ecx, ecy, ecz in eye_centers:
        base_idx = len(vertices)
        u_steps, v_steps = 32, 24

        for j in range(v_steps + 1):
            v = j / v_steps
            phi = v * np.pi
            for i in range(u_steps + 1):
                u_val = i / u_steps
                theta = u_val * 2 * np.pi
                r = 0.045

                x = r * np.sin(phi) * np.cos(theta)
                y = r * np.sin(phi) * np.sin(theta)
                z = r * np.cos(phi)

                if z > 0.02:
                    bulge = 0.015 * np.exp(-((x**2 + y**2)) / 0.001)
                    z += bulge

                vertices.append([x + ecx, y + ecy, z + ecz])
                nx, ny, nz = x, y, z
                ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
                normals.append([nx/ln, ny/ln, nz/ln])

        for j in range(v_steps):
            for i in range(u_steps):
                a = base_idx + j * (u_steps + 1) + i
                b = a + 1
                c = a + (u_steps + 1)
                d = c + 1
                indices.extend([a, b, c, b, d, c])

        # Optic nerve
        nerve_base = len(vertices)
        nerve_seg, nerve_len = 12, 8
        for li in range(nerve_len + 1):
            lt = li / nerve_len
            cz_n = ecz - 0.045 - lt * 0.15
            cy_n = ecy - lt * 0.03
            for ni in range(nerve_seg + 1):
                angle = ni / nerve_seg * 2 * np.pi
                nr = 0.008
                px = ecx + nr * np.cos(angle)
                py = cy_n + nr * np.sin(angle)
                pz = cz_n
                vertices.append([px, py, pz])
                normals.append([np.cos(angle), np.sin(angle), 0])

        for li in range(nerve_len):
            for ni in range(nerve_seg):
                a = nerve_base + li * (nerve_seg + 1) + ni
                b = a + 1
                c = a + (nerve_seg + 1)
                d = c + 1
                indices.extend([a, b, c, b, d, c])

    max_idx = len(vertices) - 1
    indices = [min(idx, max_idx) for idx in indices]

    write_glb(os.path.join(OUTPUT_DIR, "eyes.glb"), vertices, normals, indices)
    return len(vertices)


def generate_facial():
    """Generate facial muscle layers as overlapping curved sheets with fiber detail."""
    vertices = []
    normals = []
    indices = []

    muscles = [
        {"center": (0, 0.3, 0.38), "size": (0.3, 0.12, 0.05), "curve": 0.4},
        {"center": (-0.14, 0.05, 0.4), "size": (0.12, 0.1, 0.03), "curve": 0.8},
        {"center": (0.14, 0.05, 0.4), "size": (0.12, 0.1, 0.03), "curve": 0.8},
        {"center": (-0.2, -0.1, 0.38), "size": (0.08, 0.15, 0.03), "curve": 0.3},
        {"center": (0.2, -0.1, 0.38), "size": (0.08, 0.15, 0.03), "curve": 0.3},
        {"center": (0, -0.2, 0.42), "size": (0.12, 0.08, 0.025), "curve": 0.6},
        {"center": (-0.28, -0.15, 0.25), "size": (0.06, 0.12, 0.04), "curve": 0.2},
        {"center": (0.28, -0.15, 0.25), "size": (0.06, 0.12, 0.04), "curve": 0.2},
        {"center": (-0.3, 0.15, 0.2), "size": (0.08, 0.14, 0.04), "curve": 0.5},
        {"center": (0.3, 0.15, 0.2), "size": (0.08, 0.14, 0.04), "curve": 0.5},
    ]

    u_res, v_res = 16, 16

    for muscle in muscles:
        base_idx = len(vertices)
        cx, cy, cz = muscle["center"]
        sx, sy, sz = muscle["size"]
        curve = muscle["curve"]

        for j in range(v_res + 1):
            vt = j / v_res - 0.5
            for i in range(u_res + 1):
                ut = i / u_res - 0.5

                x = cx + ut * sx * 2
                y = cy + vt * sy * 2

                r = np.sqrt(ut*ut + vt*vt)
                z_offset = sz * np.cos(r * np.pi * curve) if r < 1 else 0
                z = cz + z_offset

                fiber = 0.003 * np.sin(ut * 20) * np.cos(vt * 15)
                z += fiber

                vertices.append([x, y, z])

                nz = 1.0
                nx_n = -curve * ut * np.sin(r * np.pi * curve) if r > 0.01 else 0
                ny_n = -curve * vt * np.sin(r * np.pi * curve) if r > 0.01 else 0
                ln = np.sqrt(nx_n**2 + ny_n**2 + nz**2) + 1e-8
                normals.append([nx_n/ln, ny_n/ln, nz/ln])

        for j in range(v_res):
            for i in range(u_res):
                a = base_idx + j * (u_res + 1) + i
                b = a + 1
                c = a + (u_res + 1)
                d = c + 1
                indices.extend([a, b, c, b, d, c])

    max_idx = len(vertices) - 1
    indices = [min(idx, max_idx) for idx in indices]

    write_glb(os.path.join(OUTPUT_DIR, "facial.glb"), vertices, normals, indices)
    return len(vertices)


def generate_hands():
    """Generate hand bones mesh with metacarpals and phalanges."""
    vertices = []
    normals = []
    indices = []

    def add_bone(start, end, radius, segments=10, rings=8):
        base_idx = len(vertices)
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        dz = end[2] - start[2]
        length = np.sqrt(dx*dx + dy*dy + dz*dz)

        forward = np.array([dx, dy, dz]) / (length + 1e-8)
        up = np.array([0, 1, 0]) if abs(forward[1]) < 0.9 else np.array([1, 0, 0])
        right = np.cross(forward, up)
        right /= np.linalg.norm(right) + 1e-8
        up = np.cross(right, forward)
        up /= np.linalg.norm(up) + 1e-8

        for li in range(rings + 1):
            t = li / rings
            taper = radius * (0.7 + 0.3 * np.sin(t * np.pi))
            if t < 0.15 or t > 0.85:
                edge_t = t if t < 0.15 else (1 - t)
                taper += radius * 0.3 * (1 - edge_t / 0.15)

            center = np.array(start) + np.array([dx, dy, dz]) * t

            for si in range(segments + 1):
                angle = si / segments * 2 * np.pi
                offset = right * np.cos(angle) * taper + up * np.sin(angle) * taper
                pos = center + offset
                vertices.append(pos.tolist())
                normal = (right * np.cos(angle) + up * np.sin(angle))
                normals.append(normal.tolist())

        for li in range(rings):
            for si in range(segments):
                a = base_idx + li * (segments + 1) + si
                b = a + 1
                c = a + (segments + 1)
                d = c + 1
                indices.extend([a, b, c, b, d, c])

    finger_data = [
        {"meta_start": [-0.08, 0, 0], "meta_end": [-0.12, -0.06, 0.04],
         "prox": [-0.14, -0.11, 0.06], "dist": [-0.15, -0.15, 0.07]},
        {"meta_start": [-0.04, 0, 0], "meta_end": [-0.05, -0.14, 0.01],
         "prox": [-0.055, -0.2, 0.015], "mid": [-0.06, -0.245, 0.02], "dist": [-0.062, -0.275, 0.022]},
        {"meta_start": [0, 0, 0], "meta_end": [0, -0.15, 0],
         "prox": [0, -0.215, 0.005], "mid": [0, -0.265, 0.01], "dist": [0, -0.3, 0.012]},
        {"meta_start": [0.04, 0, 0], "meta_end": [0.045, -0.14, 0.01],
         "prox": [0.048, -0.2, 0.015], "mid": [0.05, -0.24, 0.018], "dist": [0.052, -0.265, 0.02]},
        {"meta_start": [0.08, 0, 0], "meta_end": [0.085, -0.12, 0.01],
         "prox": [0.088, -0.165, 0.015], "mid": [0.09, -0.2, 0.018], "dist": [0.091, -0.225, 0.02]},
    ]

    for finger in finger_data:
        r_meta = 0.008
        r_phal = 0.006
        add_bone(finger["meta_start"], finger["meta_end"], r_meta)
        add_bone(finger["meta_end"], finger["prox"], r_phal)
        if "mid" in finger:
            add_bone(finger["prox"], finger["mid"], r_phal * 0.9)
            add_bone(finger["mid"], finger["dist"], r_phal * 0.8)
        else:
            add_bone(finger["prox"], finger["dist"], r_phal * 0.85)

    # Carpal bones cluster
    for ci in range(8):
        angle = ci / 8 * 2 * np.pi
        cx = 0.03 * np.cos(angle)
        cz = 0.03 * np.sin(angle)
        add_bone([cx - 0.01, 0.02, cz], [cx + 0.01, 0.04, cz], 0.01, segments=8, rings=6)

    max_idx = len(vertices) - 1
    indices = [min(idx, max_idx) for idx in indices]

    write_glb(os.path.join(OUTPUT_DIR, "hands.glb"), vertices, normals, indices)
    return len(vertices)


if __name__ == "__main__":
    print("Generating anatomical models for X-Ray Mirror AR...")
    print(f"Output directory: {OUTPUT_DIR}\n")

    total = 0
    total += generate_skull()
    total += generate_brain()
    total += generate_eyes()
    total += generate_facial()
    total += generate_hands()

    print(f"\n=== All models generated! Total vertices: {total} ===")
    print(f"Files in: {OUTPUT_DIR}")

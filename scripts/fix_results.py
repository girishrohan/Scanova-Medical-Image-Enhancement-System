content = open('app/ai-analysis/page.tsx').read()

old_block = '''           {/* Results */}
           {analysisResult && (
             <div style={{
               background: "white",
               borderRadius: "12px",
               padding: "1.5rem",
               border: "1px solid #e2e8f0",
             }}>
               <h3 style={{
                 color: COLORS.navy,
                 margin: "0 0 1rem 0",
                 fontSize: "1rem",
                 fontWeight: 600,
               }}>
                 Analysis Results
               </h3>
               
               <div style={{
                 background: analysisResult.findings.some((f: any) => f.risk === "high") ? "#fef2f2" : "#f0fdf4",
                 border: `1px solid ${analysisResult.findings.some((f: any) => f.risk === "high") ? "#fecaca" : "#86efac"}`,
                 borderRadius: "8px",
                 padding: "1rem",
                 marginBottom: "1rem",
               }}>
                 <p style={{
                   color: analysisResult.findings.some((f: any) => f.risk === "high") ? "#dc2626" : COLORS.success,
                   margin: 0,
                   fontWeight: 500,
                 }}>
                   {analysisResult.findings[0].type} · {analysisResult.findings[0].confidence}% confidence
                 </p>
               </div>

               <h4 style={{
                 color: COLORS.text,
                 margin: "0 0 0.5rem 0",
                 fontSize: "0.9rem",
               }}>
                 Identified Findings
               </h4>
               <ul style={{
                 color: COLORS.muted,
                 margin: "0 0 1rem 0",
                 paddingLeft: "1.25rem",
               }}>
                 {analysisResult.findings.map((finding: any, idx: number) => (
                   <li key={idx}>
                     <Check style={{ width: "14px", height: "14px", marginRight: "4px", display: "inline", color: finding.risk === "low" ? COLORS.success : COLORS.warning }} />
                     {finding.type} ({finding.confidence}% confidence)
                   </li>
                 ))}
               </ul>

               <h4 style={{
                 color: COLORS.text,
                 margin: "0 0 0.5rem 0",
                 fontSize: "0.9rem",
               }}>
                 Summary
               </h4>
               <p style={{
                 color: COLORS.muted,
                 margin: "0 0 1rem 0",
                 fontSize: "0.85rem",
               }}>
                 {analysisResult.summary}
               </p>

               <p style={{
                 color: COLORS.muted,
                 margin: 0,
                 fontSize: "0.8rem",
               }}>
                 Processing Time: {analysisResult.processingTime}
               </p>

               <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Image Metrics</h4>
               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "1rem" }}>
                 {[
                   { label: "Dimensions", value: analysisResult.metrics.width + " x " + analysisResult.metrics.height },
                   { label: "Mean Intensity", value: analysisResult.metrics.meanIntensity.toFixed(1) },
                   { label: "Std Deviation", value: analysisResult.metrics.stdDev.toFixed(1) },
                   { label: "Edge Density", value: (analysisResult.metrics.edgeDensity * 100).toFixed(1) + "%" },
                   { label: "Contrast", value: (analysisResult.metrics.contrast * 100).toFixed(1) + "%" },
                   { label: "Entropy", value: analysisResult.metrics.entropy.toFixed(2) },
                   { label: "Dark Pixels", value: (analysisResult.metrics.darkPixelRatio * 100).toFixed(1) + "%" },
                   { label: "Bright Pixels", value: (analysisResult.metrics.brightPixelRatio * 100).toFixed(1) + "%" },
                 ].map((m) => (
                   <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                     <span style={{ color: COLORS.muted }}>{m.label}</span>
                     <span style={{ fontWeight: 500 }}>{m.value}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}'''

new_block = '''           {/* Results */}
           {analysisResult && (
             <div style={{
               background: "white",
               borderRadius: "12px",
               padding: "1.5rem",
               border: "1px solid #e2e8f0",
             }}>
               <h3 style={{
                 color: COLORS.navy,
                 margin: "0 0 1rem 0",
                 fontSize: "1rem",
                 fontWeight: 600,
               }}>
                 Analysis Results
               </h3>

               {/* Body Region */}
               <div style={{
                 background: "#f0f9ff",
                 border: "1px solid #bae6fd",
                 borderRadius: "8px",
                 padding: "0.75rem 1rem",
                 marginBottom: "1rem",
                 display: "flex",
                 alignItems: "center",
                 gap: "0.5rem",
               }}>
                 <span style={{ fontSize: "1.2rem" }}>🩻</span>
                 <div>
                   <p style={{ margin: 0, fontWeight: 600, color: COLORS.navy, fontSize: "0.9rem" }}>
                     Likely Body Region: {analysisResult.bodyRegion}
                   </p>
                   <p style={{ margin: "0.25rem 0 0 0", color: COLORS.muted, fontSize: "0.75rem" }}>
                     Confidence: {analysisResult.bodyRegionConfidence} — This is an estimate based on image proportions and features.
                   </p>
                 </div>
               </div>

               {/* Urgent Finding Alert */}
               {analysisResult.urgentFinding && (
                 <div style={{
                   background: "#fef2f2",
                   border: "2px solid #dc2626",
                   borderRadius: "8px",
                   padding: "1rem",
                   marginBottom: "1rem",
                 }}>
                   <p style={{
                     color: "#dc2626",
                     margin: "0 0 0.25rem 0",
                     fontWeight: 700,
                     fontSize: "0.95rem",
                   }}>
                     ⚠️ Urgent Visual Finding
                   </p>
                   <p style={{
                     color: "#7f1d1d",
                     margin: 0,
                     fontSize: "0.875rem",
                     lineHeight: 1.5,
                   }}>
                     {analysisResult.urgentFinding}
                   </p>
                 </div>
               )}

               {/* Plain-language findings */}
               <h4 style={{
                 color: COLORS.text,
                 margin: "0 0 0.5rem 0",
                 fontSize: "0.9rem",
               }}>
                 What We Found
               </h4>
               <ul style={{
                 color: COLORS.muted,
                 margin: "0 0 1rem 0",
                 paddingLeft: "1.25rem",
                 listStyle: "none",
               }}>
                 {analysisResult.findings.map((finding: any, idx: number) => (
                   <li key={idx} style={{
                     marginBottom: "0.5rem",
                     display: "flex",
                     alignItems: "flex-start",
                     gap: "0.5rem",
                     lineHeight: 1.5,
                   }}>
                     <span style={{
                       color: finding.risk === "high" ? "#dc2626" : finding.risk === "medium" ? COLORS.warning : COLORS.success,
                       fontWeight: 700,
                       flexShrink: 0,
                     }}>
                       {finding.risk === "high" ? "⚠" : finding.risk === "medium" ? "●" : "✓"}
                     </span>
                     <span style={{ fontSize: "0.875rem" }}>
                       {finding.type}
                     </span>
                   </li>
                 ))}
               </ul>

               {/* Summary */}
               <p style={{
                 color: COLORS.muted,
                 margin: "0 0 1rem 0",
                 fontSize: "0.85rem",
                 lineHeight: 1.6,
               }}>
                 {analysisResult.summary}
               </p>

               <p style={{
                 color: COLORS.muted,
                 margin: "0 0 1rem 0",
                 fontSize: "0.8rem",
               }}>
                 Processing Time: {analysisResult.processingTime}
               </p>

               {/* Collapsible Technical Details */}
               <button
                 onClick={() => setShowTechnical(!showTechnical)}
                 style={{
                   background: "none",
                   border: "1px solid #e2e8f0",
                   borderRadius: "8px",
                   padding: "0.5rem 1rem",
                   cursor: "pointer",
                   fontSize: "0.8rem",
                   color: COLORS.muted,
                   width: "100%",
                   textAlign: "left",
                   display: "flex",
                   justifyContent: "space-between",
                   alignItems: "center",
                 }}
               >
                 <span>Technical Details</span>
                 <span>{showTechnical ? "▲" : "▼"}</span>
               </button>

               {showTechnical && (
                 <div style={{ marginTop: "0.75rem" }}>
                   <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Image Metrics</h4>
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "1rem" }}>
                     {[
                       { label: "Dimensions", value: analysisResult.metrics.width + " x " + analysisResult.metrics.height },
                       { label: "Mean Intensity", value: analysisResult.metrics.meanIntensity.toFixed(1) },
                       { label: "Std Deviation", value: analysisResult.metrics.stdDev.toFixed(1) },
                       { label: "Edge Density", value: (analysisResult.metrics.edgeDensity * 100).toFixed(1) + "%" },
                       { label: "Contrast", value: (analysisResult.metrics.contrast * 100).toFixed(1) + "%" },
                       { label: "Entropy", value: analysisResult.metrics.entropy.toFixed(2) },
                       { label: "Dark Pixels", value: (analysisResult.metrics.darkPixelRatio * 100).toFixed(1) + "%" },
                       { label: "Bright Pixels", value: (analysisResult.metrics.brightPixelRatio * 100).toFixed(1) + "%" },
                     ].map((m) => (
                       <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0.5rem", background: "#f8fafc", borderRadius: "4px" }}>
                         <span style={{ color: COLORS.muted }}>{m.label}</span>
                         <span style={{ fontWeight: 500 }}>{m.value}</span>
                       </div>
                     ))}
                   </div>

                   <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Detailed Findings</h4>
                   <ul style={{
                     color: COLORS.muted,
                     margin: "0 0 1rem 0",
                     paddingLeft: "1.25rem",
                     fontSize: "0.8rem",
                   }}>
                     {analysisResult.findings.map((finding: any, idx: number) => (
                       <li key={idx} style={{ marginBottom: "0.25rem" }}>
                         {finding.type} ({finding.confidence}% confidence, risk: {finding.risk})
                       </li>
                     ))}
                   </ul>
                 </div>
               )}

               {/* Recommendations */}
               <div style={{
                 background: analysisResult.urgentFinding ? "#fef2f2" : "#f0f9ff",
                 border: `1px solid ${analysisResult.urgentFinding ? "#fecaca" : "#bae6fd"}`,
                 borderRadius: "8px",
                 padding: "1rem",
                 marginTop: "1rem",
               }}>
                 <p style={{
                   color: analysisResult.urgentFinding ? "#dc2626" : COLORS.navy,
                   margin: "0 0 0.5rem 0",
                   fontWeight: 600,
                   fontSize: "0.9rem",
                 }}>
                   {analysisResult.urgentFinding ? "⚠️ Action Recommended" : "📋 Observation Summary"}
                 </p>
                 <p style={{
                   color: COLORS.muted,
                   margin: 0,
                   fontSize: "0.85rem",
                   lineHeight: 1.5,
                 }}>
                   {analysisResult.recommendations}
                 </p>
               </div>
             </div>
           )}'''

assert old_block in content, 'old_block not found'
content = content.replace(old_block, new_block, 1)
open('app/ai-analysis/page.tsx', 'w').write(content)
print('Fixed')
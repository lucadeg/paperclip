import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const limits={instagram:{carousel:[1,0.8],reel:[9/16]},facebook:{feed:[1,4/5,1.91]},
 tiktok:{'short-video':[9/16]},linkedin:{'professional-story':[1,1.91],document:[1,4/5]}};
function dimensions(buffer) {
 if(!Buffer.isBuffer(buffer)||buffer.byteLength>15_000_000||buffer.byteLength<50)throw Error('Invalid/truncated image bytes');
 if(buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) {
   if(buffer.toString('ascii',12,16)!=='IHDR'||buffer.readUInt32BE(8)!==13||
      !buffer.includes(Buffer.from('IEND')))throw Error('Corrupted PNG metadata');
   const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
   if(!width||!height||width>20000||height>20000)throw Error('Invalid PNG dimensions');
   return {width,height,mime:'image/png',decodeLevel:'PNG_CONTAINER_VERIFIED_NOT_FULL_PIXEL_DECODE'};
 }
 if(buffer[0]===0xff&&buffer[1]===0xd8) {
   let pos=2;
   while(pos+5<buffer.length){
     if(buffer[pos]!==0xff){pos++;continue;}
     const marker=buffer[pos+1];if(marker===0xd9)break;
     if(marker===0x00||marker===0xd8){pos+=2;continue;}
     const length=buffer.readUInt16BE(pos+2);
     if(length<2||pos+length+2>buffer.length)throw Error('Invalid JPEG marker length');
     if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
       if(length<7)throw Error('Missing JPEG frame header');
       const height=buffer.readUInt16BE(pos+5),width=buffer.readUInt16BE(pos+7);
       if(!width||!height)throw Error('Invalid JPEG dimensions');
       return {width,height,mime:'image/jpeg',decodeLevel:'JPEG_FRAME_METADATA_NOT_PIXEL_DECODE'};
     }
     pos+=2+length;
   }
   throw Error('No JPEG frame');
 }
 throw Error('Only PNG/JPEG verified image assets are supported');
}
export function inspectCreativeImage({bytes,post,assetId,sourceUrl,licenseReceipt}={}){
 const frame=dimensions(bytes);
 if(!post?.id||!post.channel||!assetId||typeof sourceUrl!=='string'||
    !/^https:\/\//.test(sourceUrl))throw Error('Asset and post provenance required');
 const ratio=frame.width/frame.height;
 const expected=limits[post.channel]?.[post.format]||[1,0.8,9/16];
 const ratioCheck=expected.some(r=>Math.abs(ratio-r)<=0.06);
 const minDimension=Math.min(frame.width,frame.height)>=720;
 return {schema:'mvx-visual-metadata-review/v1',postId:post.id,assetId,
  sourceUrl,sha256:sha(bytes),...frame,aspectRatio:Math.round(ratio*1000)/1000,
  formatStatus:ratioCheck?'RATIO_COMPATIBLE_HEURISTIC':'FORMAT_REVIEW_REQUIRED',
  resolutionStatus:minDimension?'PIXEL_DIMENSION_THRESHOLD_MET':'LOW_RESOLUTION_REVIEW_REQUIRED',
  licenseStatus:licenseReceipt?'RECEIPT_PRESENT_PENDING_INDEPENDENT_VALIDATION':'RIGHTS_NOT_VERIFIED',
  semanticVisualAuditStatus:'NOT_RUN',actualVisionProviderReceipt:null,
  contrastWCAG:null,textSafeZone:null,
  recommendations:ratioCheck?[]:['Check crop/aspect ratio with latest platform creative specs'],
  disclaimer:'Image container/header inspected only: no object recognition, accessibility or product authenticity conclusions'};
}
export async function requestVisionReview({record,post,analyzeVision,verifyWithTier1,approval}={}){
 if(record?.schema!=='mvx-visual-metadata-review/v1'||record.postId!==post?.id||
    typeof analyzeVision!=='function'||typeof verifyWithTier1!=='function'||approval!==true)
   return {status:'BLOCKED_MISSING_RUNTIME_OR_APPROVAL'};
 const proof=await verifyWithTier1({postId:post.id,assetSha256:record.sha256,sourceUrl:record.sourceUrl});
 if(proof!==true)return {status:'BLOCKED_UNVERIFIED_PRODUCT_ASSET'};
 let result;
 try{result=await analyzeVision({post,asset:record,
   rubric:['product truth','brand consistency','readability','legibility','composition','safe zone','CTA visibility',
     'misleading imagery','claim cross-modal consistency']});}
 catch{return {status:'FAILED_NO_VISUAL_ATTESTATION'};}
 if(!result||typeof result.receiptId!=='string'||!result.receiptId||
    !Array.isArray(result.findings)||!['PASS','REVIEW','BLOCKED'].includes(result.verdict)||
    result.assetSha256!==record.sha256||result.postId!==post.id)
   return {status:'BLOCKED_INVALID_VISION_RECEIPT'};
 return {status:'VISION_REVIEW_OBSERVED_NOT_AUTOPUBLISHED',
   postId:post.id,receiptId:result.receiptId,assetSha256:record.sha256,
   verdict:result.verdict,findings:result.findings.slice(0,100),reviewedAt:new Date().toISOString(),
   authority:'MODEL_PROVIDER_RECEIPT_PENDING_CUSTOMER_APPROVAL',publicationAllowed:false};
}

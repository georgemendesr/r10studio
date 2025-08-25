// diagnostic.js - Cole no console do navegador
async function testVideoCapabilities() {
  const tests = [
    { mime: 'video/webm;codecs=vp8', name: 'VP8' },
    { mime: 'video/webm;codecs=vp9', name: 'VP9' },
    { mime: 'video/mp4;codecs=avc1.42E01E', name: 'H.264' },
    { mime: 'video/webm', name: 'WebM Default' }
  ];

  console.log('=== Video Codec Support ===');
  for (const test of tests) {
    const supported = MediaRecorder.isTypeSupported(test.mime);
    console.log(`${test.name}: ${supported ? '✅' : '❌'}`);
  }

  // Teste de captura
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const stream = canvas.captureStream(30);
    
    console.log('\n=== Testing MediaRecorder ===');
    
    for (const test of tests.filter(t => MediaRecorder.isTypeSupported(t.mime))) {
      try {
        const recorder = new MediaRecorder(stream, { 
          mimeType: test.mime,
          videoBitsPerSecond: 1000000 
        });
        console.log(`${test.name}: ✅ Can create recorder`);
        recorder.stop();
      } catch (e) {
        console.log(`${test.name}: ❌ ${e.message}`);
      }
    }
  } catch (e) {
    console.error('Canvas capture failed:', e);
  }

  // Teste adicional: Canvas stream properties
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    
    // Desenhar algo no canvas
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    
    const stream = canvas.captureStream(30);
    console.log('\n=== Canvas Stream Properties ===');
    console.log('Stream active:', stream.active);
    console.log('Video tracks:', stream.getVideoTracks().length);
    
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      console.log('Track enabled:', videoTrack.enabled);
      console.log('Track ready state:', videoTrack.readyState);
      console.log('Track settings:', videoTrack.getSettings());
    }
    
  } catch (e) {
    console.error('Canvas stream test failed:', e);
  }
}

// Função para testar renderização específica do projeto
async function testProjectRendering() {
  console.log('\n=== Project Specific Tests ===');
  
  try {
    // Simular configuração do projeto
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    
    // Configurar stream como no projeto
    const stream = canvas.captureStream(0); // 0 = manual frame capture
    
    const mimeCandidates = [
      'video/mp4;codecs=avc1.42E01E',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    
    const supportedMime = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m));
    console.log('Selected MIME:', supportedMime);
    
    if (supportedMime) {
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 50000000 // 50Mbps como no projeto
      });
      
      console.log('✅ Project configuration supported');
      
      let chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('📦 Data chunk received:', event.data.size, 'bytes');
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: supportedMime });
        console.log('🎬 Final video size:', blob.size, 'bytes');
        
        if (blob.size < 1000) {
          console.error('❌ VIDEO TOO SMALL - This indicates the rendering problem!');
        } else {
          console.log('✅ Video size looks normal');
        }
      };
      
      // Iniciar gravação
      recorder.start();
      
      // Simular renderização por 2 segundos
      const startTime = Date.now();
      const renderLoop = () => {
        const elapsed = Date.now() - startTime;
        
        // Desenhar frame
        ctx.fillStyle = `hsl(${elapsed / 10}, 50%, 50%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.fillText(`Frame: ${Math.floor(elapsed / 33)}`, 50, 100);
        
        // Forçar captura do frame
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.requestFrame) {
          videoTrack.requestFrame();
        }
        
        if (elapsed < 2000) {
          requestAnimationFrame(renderLoop);
        } else {
          recorder.stop();
          console.log('🏁 Test rendering completed');
        }
      };
      
      renderLoop();
      
    } else {
      console.error('❌ No supported MIME type found');
    }
    
  } catch (e) {
    console.error('Project test failed:', e);
  }
}

console.log('🔧 Video Diagnostics Tool Loaded');
console.log('Run testVideoCapabilities() to test codec support');
console.log('Run testProjectRendering() to test project-specific rendering');

// Auto-run basic test
testVideoCapabilities();

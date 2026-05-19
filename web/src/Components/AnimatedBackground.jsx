import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Ajustar tamaño del canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Partículas flotantes (detalles tech minimalistas)
    const particles = [];
    const particleCount = 200; // Pocos para no sobrecargar
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedY: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.3 + 0.1,
        type: Math.random() > 0.5 ? 'circle' : 'square'
      });
    }

    // Línea láser serpiente
    const laserPoints = [];
    const laserLength = 80;
    const laserY = canvas.height * 0.85; // En la parte inferior
    
    for (let i = 0; i < laserLength; i++) {
      laserPoints.push({
        x: (canvas.width / laserLength) * i,
        y: laserY,
        offset: i * 0.1
      });
    }

    let time = 0;

    const animate = () => {
      // Fondo negro profundo
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Efecto de profundidad abismo (gradiente sutil)
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.height
      );
      gradient.addColorStop(0, 'rgba(0, 10, 20, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dibujar partículas tech azules
      particles.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        
        if (particle.type === 'circle') {
          // Círculos (puntos de circuito)
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = '#00a8ff';
          ctx.fill();
          
          // Brillo sutil
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size + 2, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 168, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Cuadrados pequeños (chips)
          ctx.fillStyle = '#0088cc';
          ctx.fillRect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size
          );
        }
        
        ctx.restore();

        // Movimiento lento hacia arriba
        particle.y -= particle.speedY;
        
        // Reiniciar cuando sale del canvas
        if (particle.y < -10) {
          particle.y = canvas.height + 10;
          particle.x = Math.random() * canvas.width;
        }
      });

      // Líneas de conexión sutiles entre partículas cercanas
      ctx.strokeStyle = 'rgba(0, 168, 255, 0.08)';
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Dibujar línea láser serpiente
      ctx.beginPath();
      laserPoints.forEach((point, index) => {
        // Movimiento ondulatorio
        const wave = Math.sin(time + point.offset) * 15;
        point.x = (canvas.width / laserLength) * index;
        const y = laserY + wave;
        
        if (index === 0) {
          ctx.moveTo(point.x, y);
        } else {
          ctx.lineTo(point.x, y);
        }
      });
      
      // Estilo láser blanco brillante
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffffff';
      ctx.stroke();
      
      // Línea de brillo adicional
      ctx.beginPath();
      laserPoints.forEach((point, index) => {
        const wave = Math.sin(time + point.offset) * 15;
        const y = laserY + wave;
        
        if (index === 0) {
          ctx.moveTo(point.x, y);
        } else {
          ctx.lineTo(point.x, y);
        }
      });
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.stroke();
      
      ctx.shadowBlur = 0;

      time += 0.03;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        backgroundColor: '#000000'
      }}
    />
  );
};

export default AnimatedBackground;
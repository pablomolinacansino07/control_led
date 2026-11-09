// Referencias a los elementos del DOM en HTML
const btnConectar = document.getElementById('btnConectar');
const btnEncender = document.getElementById('btnEncender');
const btnApagar = document.getElementById('btnApagar');
const indicadorEstado = document.getElementById('indicadorEstado');
const textoEstado = document.getElementById('textoEstado');
const badgeEstado = document.getElementById('badgeEstado');

// Variables globales para gestionar la comunicación por puerto serie USB
let port = null;
let writer = null;
let reader = null;

// Evento al pulsar el botón "Conectar con Arduino"
btnConectar.addEventListener('click', async () => {
    // Comprueba la compatibilidad con la API Web Serial (Google Chrome / Microsoft Edge)
    if (!('serial' in navigator)) {
        alert('Tu navegador no soporta Web Serial API. Utiliza Google Chrome o Microsoft Edge.');
        return;
    }

    try {
        // Solicita al usuario elegir el puerto serie del dispositivo Arduino
        port = await navigator.serial.requestPort();
        // Abre el puerto serie a una velocidad de 9600 baudios
        await port.open({ baudRate: 9600 });

        // Actualiza el estado visual del botón tras conectar
        btnConectar.textContent = 'Conectado';
        btnConectar.disabled = true;
        btnEncender.disabled = false;
        btnApagar.disabled = false;

        // Asigna el escritor e inicia la lectura en segundo plano
        writer = port.writable.getWriter();
        leerRespuestasArduino();

    } catch (error) {
        console.error('Error al conectar con Arduino:', error);
        alert('No se pudo establecer la conexión con Arduino.');
    }
});

// Envía comandos de texto ("ON" u "OFF") por el puerto serie y actualiza la web al instante
async function enviarComando(comando) {
    if (writer) {
        const encoder = new TextEncoder();
        // Envía la orden a la placa Arduino
        await writer.write(encoder.encode(comando + '\n'));
        // Actualiza la animación y el texto en la pantalla inmediatamente
        actualizarInterfaz(comando);
    }
}

// Escuchadores de eventos para los botones Encender y Apagar
btnEncender.addEventListener('click', () => enviarComando('ON'));
btnApagar.addEventListener('click', () => enviarComando('OFF'));

// Lee de forma continua los mensajes de confirmación enviados desde Arduino
async function leerRespuestasArduino() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                break;
            }
            if (value) {
                buffer += value;
                // Procesa las líneas recibidas usando el salto de línea como separador
                let lineas = buffer.split('\n');
                buffer = lineas.pop(); 

                for (let linea of lineas) {
                    const comandoLimpio = linea.trim().toUpperCase();
                    if (comandoLimpio === 'ON' || comandoLimpio === 'OFF') {
                        actualizarInterfaz(comandoLimpio);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error en la lectura del puerto serie:', error);
    }
}

// Actualiza los estilos CSS, el diodo luminoso y las animaciones visuales
function actualizarInterfaz(mensaje) {
    if (mensaje === 'ON') {
        indicadorEstado.className = 'estado encendido';
        textoEstado.textContent = 'LED ENCENDIDO';
        badgeEstado.textContent = 'ON';
    } else if (mensaje === 'OFF') {
        indicadorEstado.className = 'estado apagado';
        textoEstado.textContent = 'LED APAGADO';
        badgeEstado.textContent = 'OFF';
    }
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, onValue, push, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEU4aeYwiJePt6VRgmMDXUF1YwlTu2Cys",
  authDomain: "foodbreak-d0f8e.firebaseapp.com",
  projectId: "foodbreak-d0f8e",
  storageBucket: "foodbreak-d0f8e.firebasestorage.app",
  messagingSenderId: "39767375461",
  appId: "1:39767375461:web:1f80e388c23dc83389108c",
  databaseURL:"https://foodbreak-d0f8e-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let productos = [];
let pedidosPendientes = [];
let pedidosCompletados = [];
let ingresosTotales = 0.00;

onValue(ref(db, 'productos'), (snapshot) => {
    const data = snapshot.val();
    productos = [];
    if (data) {
        for (let clave in data) {
            productos.push({
                id: clave,
                ...data[clave]
            });
        }
    }
    actualizarCatalogoUI();
});

onValue(ref(db, 'ventas'), (snapshot) => {
    const data = snapshot.val();
    pedidosPendientes = [];
    if (data) {
        for (let clave in data) {
            pedidosPendientes.unshift({
                idVenta: clave,
                ...data[clave]
            });
        }
    }
    actualizarPendientesUI();
});

onValue(ref(db, 'pedidosCompletados'), (snapshot) => {
    const data = snapshot.val();
    pedidosCompletados = [];
    ingresosTotales = 0;
    if (data) {
        for (let clave in data) {
            const item = data[clave];
            pedidosCompletados.unshift({
                idCompletado: clave,
                ...item
            });
            ingresosTotales += parseFloat(item.total);
        }
    }
    actualizarCompletadosUI();
});

window.verRegistro = function(e) {
    e.preventDefault();
    document.getElementById('bloqueIngreso').classList.add('ocultar');
    document.getElementById('bloqueRegistro').classList.remove('ocultar');
};

window.verLogin = function(e) {
    e.preventDefault();
    document.getElementById('bloqueRegistro').classList.add('ocultar');
    document.getElementById('bloqueIngreso').classList.remove('ocultar');
};

window.registrarUsuario = function() {
    const usuario = document.getElementById('usuarioNuevo').value.trim();
    const contrasena = document.getElementById('claveNueva').value;

    if (usuario === "" || contrasena === "") {
        alert("Por favor rellene todos los campos para el registro.");
        return;
    }

    const rutaUser = ref(db, `usuarios/${usuario}`);
    
    get(rutaUser).then((snapshot) => {
        if (snapshot.exists()) {
            alert("El nombre de usuario ya está registrado. Intente con otro.");
        } else {
            set(rutaUser, { password: contrasena })
            .then(() => {
                alert("¡Registro exitoso! Ya puede iniciar sesión.");
                document.getElementById('usuarioNuevo').value = "";
                document.getElementById('claveNueva').value = "";
                document.getElementById('bloqueRegistro').classList.add('ocultar');
                document.getElementById('bloqueIngreso').classList.remove('ocultar');
            })
            .catch((err) => {
                console.error(err);
                alert("Error al guardar el usuario en la base de datos.");
            });
        }
    });
};

window.iniciarSesion = function() {
    const usuario = document.getElementById('usuarioIngreso').value.trim();
    const contrasena = document.getElementById('claveIngreso').value;

    if (usuario === "" || contrasena === "") {
        alert("Por favor introduzca sus credenciales.");
        return;
    }

    const rutaUser = ref(db, `usuarios/${usuario}`);

    get(rutaUser).then((snapshot) => {
        if (snapshot.exists()) {
            const dataUser = snapshot.val();
            if (dataUser.password === contrasena) {
                document.getElementById('nombreAdmin').innerText = usuario;
                document.getElementById('seccionAutenticacion').classList.add('ocultar');
                document.getElementById('panelPrincipal').classList.remove('ocultar');
                
                actualizarCatalogoUI();
                actualizarPendientesUI();
                actualizarCompletadosUI();
            } else {
                alert("Contraseña incorrecta. Intente de nuevo.");
            }
        } else {
            alert("El usuario no existe en la base de datos.");
        }
    }).catch((err) => {
        console.error(err);
        alert("Error al conectar con la base de datos.");
    });
};

window.cerrarSesion = function() {
    document.getElementById('usuarioIngreso').value = "";
    document.getElementById('claveIngreso').value = "";
    document.getElementById('panelPrincipal').classList.add('ocultar');
    document.getElementById('seccionAutenticacion').classList.remove('ocultar');
};

window.registrarProducto = function(e) {
    e.preventDefault();

    const idActual = document.getElementById('idInterno').value;
    const nombre = document.getElementById('campoNombre').value;
    const stock = parseInt(document.getElementById('campoStock').value);
    const precio = parseFloat(document.getElementById('campoPrecio').value);
    const categoria = document.getElementById('campoCategoria').value;
    let urlImagen = document.getElementById('campoImagen').value.trim();
    const desc = document.getElementById('campoDescripcion').value;

    if (!urlImagen) {
        urlImagen = "img/volo.png"; 
    }

    const paqueteDatos = {
        nombre: nombre,
        cantidad: stock,
        precio: precio,
        categoria: categoria,
        img: urlImagen,
        descripcion: desc
    };

    if (idActual) {
        set(ref(db, `productos/${idActual}`), paqueteDatos)
        .then(() => {
            alert(`¡Producto "${nombre}" actualizado con éxito!`);
            window.cancelarEdicion();
        })
        .catch((err) => {
            console.error(err);
            alert("Hubo un error al actualizar el producto.");
        });
    } else {
        const nodoProductos = ref(db, 'productos');
        const referenciaNueva = push(nodoProductos);

        set(referenciaNueva, paqueteDatos)
        .then(() => {
            document.getElementById('datosProducto').reset();
            alert(`¡Producto "${nombre}" guardado y sincronizado en la base de datos!`);
        })
        .catch((err) => {
            console.error(err);
            alert("Hubo un error al conectar con Firebase.");
        });
    }
};

window.cargarDatosEditar = function(id) {
    const item = productos.find(p => p.id === id);
    if (!item) return;

    document.getElementById('idInterno').value = item.id;
    document.getElementById('campoNombre').value = item.nombre;
    document.getElementById('campoStock').value = item.cantidad;
    document.getElementById('campoPrecio').value = item.precio;
    document.getElementById('campoCategoria').value = item.categoria;
    document.getElementById('campoImagen').value = item.img === "img/volo.png" ? "" : item.img;
    document.getElementById('campoDescripcion').value = item.descripcion || "";

    document.getElementById('tituloFormulario').innerText = "✏️ Editar Producto";
    document.getElementById('btnGuardarForm').innerText = "Guardar Cambios";
    document.getElementById('btnCancelarEdicion').classList.remove('ocultar');

    document.getElementById('datosProducto').scrollIntoView({ behavior: 'smooth' });
};

window.cancelarEdicion = function() {
    document.getElementById('datosProducto').reset();
    document.getElementById('idInterno').value = "";
    
    document.getElementById('tituloFormulario').innerText = "Cargar Nuevo Producto";
    document.getElementById('btnGuardarForm').innerText = "Publicar Producto";
    document.getElementById('btnCancelarEdicion').classList.add('ocultar');
};

window.eliminarProducto = function(id, nombre) {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el producto "${nombre}" del menú?`)) {
        remove(ref(db, `productos/${id}`))
        .then(() => {
            alert(`"${nombre}" fue removido del inventario.`);
            if (document.getElementById('idInterno').value === id) {
                window.cancelarEdicion();
            }
        })
        .catch((err) => {
            console.error(err);
            alert("No se pudo eliminar el producto de la base de datos.");
        });
    }
};

function actualizarCatalogoUI() {
    const caja = document.getElementById('galeriaAdmin');
    if (!caja) return;
    
    if (productos.length === 0) {
        caja.innerHTML = `<p class="inventarioVacio">El catálogo está vacío. Utilice el formulario superior para registrar productos.</p>`;
        return;
    }

    caja.innerHTML = productos.map(item => `
        <div class="tarjetaFichaAdmin">
            <div class="tagCategoria">${item.categoria.toUpperCase()}</div>
            <img src="${item.img}" alt="${item.nombre}" class="fotoItemAdmin">
            <h3>${item.nombre}</h3>
            <p class="reseñaAdmin">${item.descripcion || ''}</p>
            <div class="valoresFichaAdmin">
                <span><strong>Precio:</strong> $${item.precio}.00</span>
                <span><strong>Stock:</strong> ${item.cantidad} pzs</span>
            </div>
            <div class="botonesFichaAdmin" style="display: flex; gap: 10px; margin-top: 15px;">
                <button onclick="cargarDatosEditar('${item.id}')" style="flex: 1; padding: 8px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">✏️ Editar</button>
                <button onclick="eliminarProducto('${item.id}', '${item.nombre}')" style="flex: 1; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">❌ Eliminar</button>
            </div>
        </div>
    `).join('');
}

window.marcarComoCompletado = function(idVenta) {
    const orden = pedidosPendientes.find(p => p.idVenta === idVenta);
    if (!orden) return;

    if (confirm(`¿Deseas marcar el pedido #${orden.idPedido} como completado?`)) {
        const nodoCompletados = ref(db, 'pedidosCompletados');
        const nuevaReferencia = push(nodoCompletados);

        set(nuevaReferencia, {
            idPedido: orden.idPedido,
            usuario: orden.usuario || "Anónimo",
            producto: orden.producto,
            total: orden.total,
            hora: orden.hora,
            metodoEntrega: orden.metodoEntrega,
            direccion: orden.direccion
        })
        .then(() => {
            return remove(ref(db, `ventas/${idVenta}`));
        })
        .catch((err) => {
            console.error(err);
            alert("Ocurrió un error al procesar el cambio de estado del pedido.");
        });
    }
};

function actualizarPendientesUI() {
    const cajaPendientes = document.getElementById('listaPendientes');
    if (!cajaPendientes) return;

    if (pedidosPendientes.length === 0) {
        cajaPendientes.className = "vacioMensaje";
        cajaPendientes.innerHTML = "No hay pedidos pendientes de procesamiento.";
        return;
    }

    cajaPendientes.className = "listaHistorialActiva";
    cajaPendientes.innerHTML = pedidosPendientes.map(orden => {
        const transporte = orden.metodoEntrega === 'domicilio' ? '🛵 DOMICILIO' : '🏪 LOCAL';
        const bloqueDireccion = orden.metodoEntrega === 'domicilio' ? `<div class="ubicacionPedido">📍 ${orden.direccion}</div>` : '';
        const clienteActivo = orden.usuario ? `<span style="font-size:12px; display:block; color:#2c3e50;">👤 Cliente: ${orden.usuario}</span>` : '';

        return `
            <div class="tarjetaVenta" style="flex-direction: column; gap: 5px; border-left: 5px solid #f1c40f;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <div class="datosVentaIzquierda">
                        <span class="codigoPedido">Pedido #${orden.idPedido} (${transporte})</span>
                        <span class="descripcionPedido">${orden.producto}</span>
                        ${clienteActivo}
                    </div>
                    <div class="datosVentaDerecha">
                        <span class="montoPedido" style="color: #f39c12;">$${orden.total}.00</span>
                        <span class="tiempoPedido">${orden.hora}</span>
                    </div>
                </div>
                ${bloqueDireccion}
                <button onclick="marcarComoCompletado('${orden.idVenta}')" class="btnTerminarPedido">✔ Completado</button>
            </div>
        `;
    }).join('');
}

function actualizarCompletadosUI() {
    const marcadorTotal = document.getElementById('totalGanancias');
    const cajaCompletados = document.getElementById('listaCompletados');
    
    if (marcadorTotal) marcadorTotal.innerText = ingresosTotales.toFixed(2);
    if (!cajaCompletados) return;

    if (pedidosCompletados.length === 0) {
        cajaCompletados.className = "vacioMensaje";
        cajaCompletados.innerHTML = "Aún no se han completado pedidos.";
        return;
    }

    cajaCompletados.className = "listaHistorialActiva";
    cajaCompletados.innerHTML = pedidosCompletados.map(orden => {
        const transporte = orden.metodoEntrega === 'domicilio' ? '🛵 DOMICILIO' : '🏪 LOCAL';
        const bloqueDireccion = orden.metodoEntrega === 'domicilio' ? `<div class="ubicacionPedido">📍 ${orden.direccion}</div>` : '';

        return `
            <div class="tarjetaVenta" style="flex-direction: column; gap: 5px; border-left: 5px solid #2ecc71; opacity: 0.85;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <div class="datosVentaIzquierda">
                        <span class="codigoPedido" style="color:#7f8c8d;">Pedido #${orden.idPedido} (${transporte}) - ✅ Listo</span>
                        <span class="descripcionPedido" style="text-decoration: line-through; color: #7f8c8d;">${orden.producto}</span>
                        <span style="font-size:12px; color:#7f8c8d;">👤 Cliente: ${orden.usuario}</span>
                    </div>
                    <div class="datosVentaDerecha">
                        <span class="montoPedido">+$${orden.total}.00</span>
                        <span class="tiempoPedido">${orden.hora}</span>
                    </div>
                </div>
                ${bloqueDireccion}
            </div>
        `;
    }).join('');
}
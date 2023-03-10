const { validatePassword, validateEmail, validateIfItsNumber } = require("../utils/validators");
const md5 = require('blueimp-md5');
const { redirecter } = require("../utils/redirecter");

module.exports = class UsersController {

    constructor(pool) {
        this.pool = pool
    }

signUp_get = async (req, res) => {
    const [ciudades] = await this.pool.query('SELECT * FROM ciudades');
    const [estados] = await this.pool.query('SELECT * FROM estados');
    const [municipios] = await this.pool.query('SELECT * FROM municipios');
    const [parroquias] = await this.pool.query('SELECT * FROM parroquias');
    const direccionData = { ciudades, estados, municipios, parroquias }
   // console.log(direccionData)
    res.render('signup', { direccionData })
}

signUp_post =  async (req,res) => {
    try {
        const { p_nombre, 
            s_nombre, 
            p_apellido,
             s_apellido,  
             email, 
             password, 
             repeatedPassword,
             cedula, 
             telf,
             direccion_1,
             casa
            } = req.body;
         const fields = Object.values(req.body)
         fields.forEach(f => {
            console.log(req.body)
            if (f.length <= 0) {
                throw new Error('Todos los campos deben ser llenados')
            }
            if(password !== repeatedPassword) throw Error('Las contraseñas deben ser iguales');
            if (!validateEmail(email)) throw Error("el email es invalido");
            if(!validatePassword(password)) {
                throw new Error('El password debe tener al menos 3 numeros')
            }
         })
         if ([p_nombre, s_nombre, p_apellido, s_apellido].some(validateIfItsNumber)) throw new Error("Los campos de nombres y apellidos no pueden ser numeros");
         const hashedPassword = md5(password)
        const [{insertId}] = await this.pool.query('INSERT INTO direcciones (id_estado, id_ciudad, id_municipio, id_parroquia, direccion_1, casa ) VALUES (?, ?, ?, ?, ?, ?)',
       [1, 1, 1, 1, direccion_1, casa])
      const [row] = await this.pool.query('INSERT INTO users (p_nombre, s_nombre, p_apellido, s_apellido, status, email, password, cedula, telf, direccion_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
     [p_nombre, s_nombre, p_apellido,s_apellido, 'ACTIVO', email,hashedPassword,cedula,telf, insertId])
        await this.pool.query('INSERT INTO users_roles (user_id, rol_id) VALUES (?, ?)',[row.insertId, 9])
      
     res.redirect('/login')
    } catch (error) {
        console.log(error)
        req.session.errors = [error.message]
        res.redirect('/signup')
    }
 }

 login = async (req,res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = md5(password)
        if (email.length <= 0 || password.length <= 0) throw new Error('Todos los campos deben ser llenados');       
        const [[user]] = await this.pool.query('SELECT * from users WHERE email = ?', [email])
        if(!user) throw new Error('Email incorrecto');
        if(user.password.toString() !== hashedPassword) throw new Error('Contraseña incorrecta');
        const [[{rol_name}]] = await this.pool.query(`
        SELECT r.name AS rol_name FROM users_roles ur
        LEFT JOIN users u ON u.user_id = ur.user_id
        LEFT JOIN roles r ON r.rol_id = ur.rol_id
        WHERE ur.user_id = ?
    `, [user.user_id])  
        console.log("login-user", user)
        req.session.user = {...user, rol: rol_name}
        req.session.errors = []
        if(req.session.user.status === 'BLOQUEADO') throw new Error('Tu cuenta ha sido bloqueada');
        redirecter({res, rol: req.session.user.rol})
        //res.redirect('/')
    } catch (error) {
        req.session.errors = [error.message]
        res.redirect('/login')
    }
    
}

registrarEmpleado = async (req,res) => {
    try {
        const user = req.session.user
        const { p_nombre, 
            s_nombre, 
            p_apellido,
             s_apellido,  
             email, 
             password, 
             cedula, 
             telf,
             direccion_1,
             casa,
             rol
            } = req.body;
         const fields = Object.values(req.body)
         fields.forEach(f => {
            console.log(req.body)
            if (f.length <= 0) {
                throw new Error('Todos los campos deben ser llenados')
            }
            if(!validatePassword(password)) {
                throw new Error('El password debe tener al menos 3 numeros')
            }
         })
         if ([p_nombre, s_nombre, p_apellido, s_apellido].some(validateIfItsNumber)) throw new Error("Los campos de nombres y apellidos no pueden ser numeros");
         const hashedPassword = md5(password)
        const [{insertId}] = await this.pool.query('INSERT INTO direcciones (id_estado, id_ciudad, id_municipio, id_parroquia, direccion_1, casa ) VALUES (?, ?, ?, ?, ?, ?)',
       [1, 1, 1, 1, direccion_1, casa])
      const [row] = await this.pool.query('INSERT INTO users (p_nombre, s_nombre, p_apellido, s_apellido, status, email, password, cedula, telf, direccion_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
     [p_nombre, s_nombre, p_apellido,s_apellido, 'ACTIVO', email,hashedPassword,cedula,telf, insertId])
     await this.pool.query('INSERT INTO users_roles (user_id, rol_id) VALUES (?, ?)',[row.insertId, rol])
     res.redirect('/login')
    } catch (error) {
        console.log(error)
        req.session.errors = [error.message]
        res.redirect('/registrarEmpleado')
    }
    
}

registrarEmpleado_get = async (req, res) => {
    const [roles] = await this.pool.query('SELECT * from roles')
    res.render('registrar-empleado', { roles })
}

inventarioDashboard = async (req, res) => {
    const [row] = await this.pool.query('SELECT SUM(precio_total) as ganancias FROM `orders`')
    const [rows] = await this.pool.query('SELECT COUNT(od.product_id) as vend, od.product_id, p.name FROM `order_Details` od LEFT JOIN product p ON od.product_id = p.product_id GROUP BY od.product_id;')
    console.log(row)
    console.log(rows)
    res.render('inventario-dashboard', { ganancias: row[0].ganancias, products: rows })
}

bloquearUsuario = async (req, res) => {
    try {
        const { user_id } = req.body
        await this.pool.query(`UPDATE users SET status = 'BLOQUEADO' WHERE user_id = ?`, [user_id])
        res.redirect('/users')
    } catch (error) {
        console.log(error)
    }
}

desbloquearUsuario = async (req, res) => {
    try {
        const { user_id } = req.body
        await this.pool.query(`UPDATE users SET status = 'ACTIVO' WHERE user_id = ?`, [user_id])
        res.redirect('/users')
    } catch (error) {
        console.log(error)
    }
}

usersDashboard = async (req, res) => {
    const [users] = await this.pool.query('SELECT * from users')
    res.render('admin-dashboard-users', { users })
}

contadorDashboard = async (req, res) => {
    const [facturas] = await this.pool.query('SELECT * from factura')
    res.render('contador-dashboard', { facturas })
}

aceptarFactura = async (req, res) => {
    const { factura_id } = req.body
    await this.pool.query("UPDATE factura SET status = 'aceptada' WHERE factura_id = ?", [factura_id])
    res.redirect('/contadorDashboard')
}

devolucion = async (req, res) => {
    const { factura_id } = req.body
   await this.pool.query("UPDATE factura SET status = 'devuelta' WHERE factura_id = ?", [factura_id])
    res.redirect('/contadorDashboard')
}

rechazarFactura = async (req, res) => {
    const { factura_id } = req.body
    await this.pool.query("UPDATE factura SET status = 'rechazada' WHERE factura_id = ?", [factura_id])
    res.redirect('/contadorDashboard')
}

}

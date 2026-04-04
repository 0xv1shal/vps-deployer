import { Router } from "express";
import { login, register, viewLogin, viewRegister } from "./controllers/auth.controller.ts";
import limitNgin from 'limitngin'

const router = Router()

router.use(limitNgin({
    allowedNoOfRequests: 40,
    intervalInSec: 60,
    algorithm: 'sliding_window_counter',
    blocks:'ip_addr'
}))

router.get('/login',viewLogin)
router.get('/register',viewRegister)
router.post('/login',login)
router.post('/register',register)

export default router
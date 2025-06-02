import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class UsuarioLogin extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    nombre: string
    @Column()
    nombreUsuario: string
    @Column()
    clave: string
    @Column({ default: 'admin' }) // valores: 'admin', 'visor'
    rol: string;
}

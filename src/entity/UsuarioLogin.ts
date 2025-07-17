import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {IpUsuario} from "./IpUsuario";

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
    @OneToMany(() => IpUsuario, ip => ip.usuario)
    ips: IpUsuario[];
}

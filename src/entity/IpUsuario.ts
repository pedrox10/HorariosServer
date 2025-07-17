// ip-usuario.entity.ts
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, BaseEntity} from "typeorm";
import { UsuarioLogin } from "./UsuarioLogin";

@Entity()
@Unique(["usuario", "ip"]) // evita duplicados
export class IpUsuario extends BaseEntity  {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    ip: string;
    @ManyToOne(() => UsuarioLogin, usuario => usuario.ips, { onDelete: "CASCADE" })
    usuario: UsuarioLogin;
    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    fecha: Date;
}
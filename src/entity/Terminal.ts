import {Entity, Column, PrimaryGeneratedColumn, BaseEntity, OneToMany} from "typeorm"
import {Marcacion} from "./Marcacion";
import {Usuario} from "./Usuario";

@Entity()
export class  Terminal extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string
    @Column()
    ip: string
    @Column()
    puerto: number
    @Column({type: 'datetime', nullable: true})
    ult_sincronizacion: Date;

    @OneToMany(() => Usuario, (usuario) => usuario.terminal)
    usuarios: Usuario[]
    @OneToMany(() => Marcacion, (marcacion) => marcacion.terminal)
    marcaciones: Marcacion[]
}
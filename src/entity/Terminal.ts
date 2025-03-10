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
    ultSincronizacion: Date;
    @Column()
    numSerie: string
    @Column()
    totalMarcaciones: number
    @Column()
    tieneConexion: boolean
    @OneToMany(() => Usuario, (usuario) => usuario.terminal)
    usuarios: Usuario[]
    @OneToMany(() => Marcacion, (marcacion) => marcacion.terminal)
    marcaciones: Marcacion[]
}
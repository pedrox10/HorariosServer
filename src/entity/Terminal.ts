import {Entity, Column, PrimaryGeneratedColumn, BaseEntity, OneToMany} from "typeorm"
import {Marcacion} from "./Marcacion";
import {Usuario} from "./Usuario";
import {Sincronizacion} from "./Sincronizacion";
import {Interrupcion} from "./Interrupcion";

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
    @Column({ nullable: true })
    numSerie: string
    @Column({ nullable: true})
    totalMarcaciones: number
    @Column()
    categoria: string
    @Column({ nullable: true })
    tieneConexion: boolean
    @OneToMany(() => Usuario, (usuario) => usuario.terminal)
    usuarios: Usuario[]
    @OneToMany(() => Marcacion, (marcacion) => marcacion.terminal)
    marcaciones: Marcacion[]
    @OneToMany(() => Sincronizacion, (sincronizacion) => sincronizacion.terminal)
    sincronizaciones: Sincronizacion[]
    @OneToMany(() => Interrupcion, (interrupcion) => interrupcion.terminal)
    interrupciones: Interrupcion[]

}
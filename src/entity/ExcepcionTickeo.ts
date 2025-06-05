import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity} from "typeorm"
import {Licencia} from "./Licencia";
import {Usuario} from "./Usuario";

export enum TipoExcepcion {
    rango,          //Excepciones para rangos de horas
    completa,       //Excepciones de jornada completa
}

@Entity()
export class ExcepcionTickeo extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'date'})
    fecha: Date
    @Column()
    tipo:TipoExcepcion
    @Column({type: 'time', nullable: true})
    horaIni: Date
    @Column({type: 'time', nullable: true})
    horaFin: Date
    @Column({nullable: true})
    detalle: string
    @ManyToOne(() => Licencia)
    licencia: Licencia
    /*@ManyToOne(() => Usuario, (usuario) => usuario.excepcionesTickeo)
    usuario: Usuario*/
}
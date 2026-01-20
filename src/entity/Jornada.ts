import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity, Index} from "typeorm"
import {Horario} from "./Horario";
import {EstadoUsuario, Usuario} from "./Usuario";
import {Turno} from "./Turno";
import {InfoExtraJornada} from "../models/InfoExtraJornada";

export enum EstadoJornada {
    dia_libre,
    activa,
    feriado,
    vacacion,
    baja_medica,
    permiso,
    permiso_sg,
    licencia,
    sin_asignar,
    sin_registros,
    ausencia,
    teletrabajo,
    capacitacion,
    permiso_cg
}

@Entity()
@Index(["usuario", "fecha"])
export class Jornada extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'date'})
    fecha: Date
    @OneToOne(() => Turno, (turno) => turno.jornada, { cascade: true, onDelete: "CASCADE",  nullable: true })
    @JoinColumn()
    priTurno: Turno | null
    @OneToOne(() => Turno,(turno) => turno.jornada, { cascade: true, onDelete: "CASCADE",  nullable: true } )
    @JoinColumn()
    segTurno: Turno | null
    @Column({ default: EstadoJornada.activa })
    estado:EstadoJornada
    @Column({nullable: true})
    esInvierno: boolean
    @Column({nullable: true})
    esLactancia: boolean
    @ManyToOne(() => Usuario, (usuario) => usuario.jornadas, { cascade: true, onDelete: "CASCADE" })
    usuario: Usuario
    @ManyToOne(() => Horario)
    horario: Horario
    infoExtra: InfoExtraJornada

    getNumTurnos() {
        let res: number = 0;
        if (this.priTurno == null && this.segTurno == null)
            res = 0;
        else if (this.priTurno != null && this.segTurno == null)
            res = 1;
        else if (this.priTurno != null && this.segTurno != null)
            res = 2
        return res;
    }
}
import {BaseEntity, Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Terminal} from "./Terminal";
import {Usuario} from "./Usuario";

@Entity()
@Index(['usuario', 'terminal', 'semanaISO'], { unique: true })
export class Notificacion extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;
    @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
    usuario: Usuario;
    @ManyToOne(() => Terminal, { onDelete: 'CASCADE' })
    terminal: Terminal;
    @Column()
    diasSinMarcacion: number;
    @Column()
    diasSinAsignacion: number;
    @Column()
    semanaISO: string; // ej: 2026-W06
    @Column()
    tipoSemana: 'actual' | 'anterior';
    @Column({ type: 'date' })
    fechaHastaEvaluada: Date;
    @Column({ type: 'datetime' })
    fechaActualizacion: Date;
}
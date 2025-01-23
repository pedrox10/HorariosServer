import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity, OneToMany} from "typeorm"
import {Horario} from "./Horario";

@Entity()
export class JornadaDia extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    habilitado: boolean = false;
    @Column()
    dia: string
    @Column({type: 'time', nullable: true})
    priEntrada: Date;
    @Column({type: 'time', nullable: true})
    priSalida: Date;
    @Column({type: 'time', nullable: true})
    segEntrada: Date;
    @Column({type: 'time', nullable: true})
    segSalida: Date;
    @ManyToOne(() => Horario, (horario) => horario.jornadaDias, {cascade: true, onDelete: "CASCADE"})
    horario: Horario
}